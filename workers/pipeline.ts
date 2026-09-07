import { execFile } from "child_process";
import { promisify } from "util";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { parseBuffer } from "music-metadata";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMaxDurationSeconds, getMaxUploadBytes } from "@/lib/env";
import { detectAudioMagic } from "@/lib/audio";
import {
  downloadPrivateObject,
  normalizedAudioPath,
  uploadPrivateObject,
} from "@/lib/storage";
import {
  getAlignmentProvider,
  getLanguageProvider,
  getTranscriptionProvider,
} from "@/providers/index";
import type { TranscriptionResult, WordTiming } from "@/providers/types";
import { loadCurrentLyrics } from "@/services/corrections";
import { mean } from "@/lib/utils";

const execFileAsync = promisify(execFile);

const STEPS = ["validate", "store", "normalize", "transcribe", "language", "align", "costs", "complete"] as const;
type StepName = (typeof STEPS)[number];

interface PipelineTrack {
  id: string;
  user_id: string;
  audio_path: string | null;
  audio_sha256: string | null;
  duration_seconds: number | string | null;
  status: string;
}

interface JobContext {
  track: PipelineTrack;
  originalLocalPath: string | null;
  normalizedLocalPath: string | null;
  transcription: TranscriptionResult | null;
  language: { language: string; dialect?: string; confidence: number; dialectConfidence?: number; costCents: number } | null;
  words: WordTiming[];
  transcriptionCostCents: number;
  languageCostCents: number;
  processingCostCents: number;
  workDir: string;
}

async function markJob(
  trackId: string,
  step: StepName,
  state: "running" | "succeeded" | "failed",
  extra?: { error?: string; provider?: string }
): Promise<void> {
  const admin = createAdminClient();
  const patch: Record<string, string | number | null> = { state };
  if (state === "running") {
    patch.started_at = new Date().toISOString();
    patch.error = null;
  }
  if (state === "succeeded" || state === "failed") {
    patch.finished_at = new Date().toISOString();
  }
  if (extra?.error) patch.error = extra.error;
  if (extra?.provider) patch.provider = extra.provider;

  const { data: existing } = await admin
    .from("processing_jobs")
    .select("id, attempts")
    .eq("track_id", trackId)
    .eq("step", step)
    .maybeSingle();

  if (existing) {
    const attempts = state === "running" ? Number(existing.attempts ?? 0) + 1 : existing.attempts;
    await admin.from("processing_jobs").update({ ...patch, attempts }).eq("id", existing.id);
    return;
  }

  await admin.from("processing_jobs").insert({
    track_id: trackId,
    step,
    state,
    attempts: state === "running" ? 1 : 0,
    ...patch,
  });
}

async function setTrackStatus(
  trackId: string,
  status: string,
  extra?: { error?: string | null; language?: string; languageConfidence?: number; dialect?: string; dialectConfidence?: number; transcriptionConfidence?: number; durationSeconds?: number }
): Promise<void> {
  const admin = createAdminClient();
  const patch: Record<string, string | number | null> = { status };
  if (extra?.error !== undefined) patch.error_message = extra.error;
  if (extra?.language) patch.language = extra.language;
  if (extra?.languageConfidence !== undefined) patch.language_confidence = extra.languageConfidence;
  if (extra?.dialect) patch.dialect = extra.dialect;
  if (extra?.dialectConfidence !== undefined) patch.dialect_confidence = extra.dialectConfidence;
  if (extra?.transcriptionConfidence !== undefined) {
    patch.transcription_confidence = extra.transcriptionConfidence;
  }
  if (extra?.durationSeconds !== undefined) patch.duration_seconds = extra.durationSeconds;
  await admin.from("tracks").update(patch).eq("id", trackId);
}

async function runStep(trackId: string, step: StepName, fn: () => Promise<void>, provider?: string): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("processing_jobs")
    .select("state")
    .eq("track_id", trackId)
    .eq("step", step)
    .maybeSingle();
  if (data?.state === "succeeded") return;

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await markJob(trackId, step, "running", { provider });
    try {
      await fn();
      await markJob(trackId, step, "succeeded", { provider });
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      await markJob(trackId, step, "failed", { error: lastError.message, provider });
    }
  }
  throw lastError ?? new Error(`${step} failed`);
}

async function ffmpegNormalize(inputPath: string, outputPath: string): Promise<void> {
  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      inputPath,
      "-ac",
      "1",
      "-ar",
      "16000",
      "-c:a",
      "pcm_s16le",
      outputPath,
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("ENOENT")) {
      throw new Error("ffmpeg is not installed on the worker host. Install ffmpeg to normalize audio.");
    }
    throw new Error(`ffmpeg normalize failed: ${message}`);
  }
}

async function hydrateTranscription(trackId: string): Promise<{ result: TranscriptionResult } | null> {
  const existing = await loadCurrentLyrics(trackId);
  if (!existing) return null;

  const admin = createAdminClient();
  const { data: track } = await admin
    .from("tracks")
    .select("language, language_confidence")
    .eq("id", trackId)
    .maybeSingle();

  return {
    result: {
      text: existing.fullText ?? existing.lines.map((line) => line.text).join("\n"),
      lines: existing.lines.map((line) => ({
        text: line.text,
        startMs: line.startMs,
        endMs: line.endMs,
        confidence: line.confidence,
      })),
      words: existing.lines.flatMap((line) => line.words),
      language: (track?.language as string | null) ?? "und",
      languageConfidence: Number(track?.language_confidence ?? existing.confidence ?? 0.5),
      costCents: 0,
      provider: "existing",
      usage: { durationSeconds: 0, centsPerMinute: 0 },
    },
  };
}

async function persistTranscription(trackId: string, result: TranscriptionResult, words: WordTiming[]): Promise<void> {
  const admin = createAdminClient();
  await admin.from("transcriptions").update({ is_current: false }).eq("track_id", trackId).eq("is_current", true);

  const confidence = mean(result.lines.map((line) => line.confidence).concat(words.map((word) => word.confidence)));

  const { data: latest } = await admin
    .from("transcriptions")
    .select("version")
    .eq("track_id", trackId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextVersion = (latest?.version as number | undefined ?? 0) + 1;

  const { data: transcription, error } = await admin
    .from("transcriptions")
    .insert({
      track_id: trackId,
      version: nextVersion,
      source: "ai",
      provider: result.provider,
      full_text: result.text,
      confidence: Number(confidence.toFixed(4)),
      is_current: true,
    })
    .select("id")
    .single();

  if (error || !transcription) {
    throw new Error(error?.message ?? "Failed to store transcription.");
  }

  for (const [index, line] of result.lines.entries()) {
    const { data: lineRow, error: lineError } = await admin
      .from("lyric_lines")
      .insert({
        transcription_id: transcription.id,
        line_index: index,
        text: line.text,
        start_ms: line.startMs,
        end_ms: line.endMs,
        confidence: line.confidence,
      })
      .select("id")
      .single();
    if (lineError || !lineRow) {
      throw new Error(lineError?.message ?? "Failed to store lyric lines.");
    }
    const lineWords = words.filter((word) => word.lineIndex === index);
    if (lineWords.length === 0) continue;
    const { error: wordError } = await admin.from("lyric_words").insert(
      lineWords.map((word, wordIndex) => ({
        line_id: lineRow.id,
        word_index: wordIndex,
        text: word.text,
        start_ms: word.startMs,
        end_ms: word.endMs,
        confidence: word.confidence,
      }))
    );
    if (wordError) {
      throw new Error(wordError.message);
    }
  }
}

export async function processTrack(trackId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: track, error } = await admin
    .from("tracks")
    .select("id, user_id, audio_path, audio_sha256, duration_seconds, status")
    .eq("id", trackId)
    .maybeSingle();

  if (error || !track) {
    throw new Error(error?.message ?? `Track ${trackId} not found`);
  }

  const workDir = await mkdtemp(path.join(tmpdir(), "lyrixis-"));
  const ctx: JobContext = {
    track: track as PipelineTrack,
    originalLocalPath: null,
    normalizedLocalPath: null,
    transcription: null,
    language: null,
    words: [],
    transcriptionCostCents: 0,
    languageCostCents: 0,
    processingCostCents: 0,
    workDir,
  };

  try {
    await setTrackStatus(trackId, "processing", { error: null });

    await runStep(trackId, "validate", async () => {
      if (!ctx.track.audio_path) {
        throw new Error("Track has no audio_path in private storage.");
      }
      const bytes = await downloadPrivateObject(ctx.track.audio_path);
      if (bytes.length > getMaxUploadBytes()) {
        throw new Error("File exceeds MAX_UPLOAD_MB.");
      }
      const magic = detectAudioMagic(bytes);
      if (!magic) {
        throw new Error("Audio failed magic-byte validation.");
      }
      const ext = path.extname(ctx.track.audio_path) || `.${magic.extension}`;
      const localPath = path.join(workDir, `original${ext}`);
      await writeFile(localPath, bytes);
      ctx.originalLocalPath = localPath;

      const tags = await parseBuffer(bytes);
      const duration = tags.format.duration ?? 0;
      if (duration > getMaxDurationSeconds()) {
        throw new Error(`Duration ${duration.toFixed(1)}s exceeds MAX_DURATION_SECONDS=${getMaxDurationSeconds()}.`);
      }
      ctx.track.duration_seconds = duration;
      await setTrackStatus(trackId, "processing", { durationSeconds: Number(duration.toFixed(3)) });
    });

    await runStep(trackId, "store", async () => {
      if (!ctx.track.audio_path) throw new Error("Missing audio_path.");
      // Object is already in the private bucket from upload; confirm it is downloadable.
      if (!ctx.originalLocalPath) throw new Error("Validate step did not materialize the original file.");
    });

    await runStep(trackId, "normalize", async () => {
      if (!ctx.originalLocalPath) throw new Error("No original audio to normalize.");
      const output = path.join(workDir, "normalized.wav");
      await ffmpegNormalize(ctx.originalLocalPath, output);
      ctx.normalizedLocalPath = output;
      const storagePath = normalizedAudioPath(ctx.track.user_id, trackId);
      const wav = await readFile(output);
      await uploadPrivateObject({
        path: storagePath,
        body: wav,
        contentType: "audio/wav",
      });
      await admin.from("track_files").insert({
        track_id: trackId,
        kind: "normalized",
        storage_path: storagePath,
        mime_type: "audio/wav",
        bytes: wav.length,
      });
    });

    await runStep(trackId, "transcribe", async () => {
      if (!ctx.normalizedLocalPath) throw new Error("Normalize must succeed before transcription.");
      await setTrackStatus(trackId, "transcribing");
      const provider = getTranscriptionProvider();
      const result = await provider.transcribe({ audioPath: ctx.normalizedLocalPath });
      ctx.transcription = result;
      ctx.words = result.words;
      ctx.transcriptionCostCents = result.costCents;
      await persistTranscription(trackId, result, result.words);
    }, "whisper_v3");

    if (!ctx.transcription) {
      const existing = await hydrateTranscription(trackId);
      if (existing) {
        ctx.transcription = existing.result;
        ctx.words = existing.result.words;
      }
    }

    await runStep(trackId, "language", async () => {
      if (!ctx.transcription) throw new Error("Transcription must succeed before language ID.");
      const provider = getLanguageProvider();
      const result = await provider.detect({
        audioPath: ctx.normalizedLocalPath ?? ctx.originalLocalPath ?? "",
        prior: {
          language: ctx.transcription.language,
          confidence: ctx.transcription.languageConfidence,
        },
      });
      ctx.language = result;
      ctx.languageCostCents = result.costCents;
      await setTrackStatus(trackId, "processing", {
        language: result.language,
        languageConfidence: result.confidence,
        dialect: result.dialect,
        dialectConfidence: result.dialectConfidence,
      });
    }, "whisper");

    await runStep(trackId, "align", async () => {
      const aligner = getAlignmentProvider();
      if (!aligner) {
        return;
      }
      await setTrackStatus(trackId, "aligning");
      if (!ctx.transcription) throw new Error("Transcription required before alignment.");
      // Whisper word timings already captured during transcription.
      ctx.words = ctx.transcription.words;
    });

    if (!ctx.transcription) {
      throw new Error("Pipeline ended without a transcription result.");
    }

    const overall = mean(
      ctx.transcription.lines.map((line) => line.confidence).concat(ctx.words.map((word) => word.confidence))
    );

    await runStep(trackId, "costs", async () => {
      await admin.from("track_costs").upsert(
        {
          track_id: trackId,
          transcription_cost_cents: ctx.transcriptionCostCents,
          translation_cost_cents: 0,
          processing_cost_cents: ctx.processingCostCents + ctx.languageCostCents,
          storage_cost_cents: 0,
        },
        { onConflict: "track_id" }
      );
    });

    const finalStatus = overall < 0.8 ? "manual_review" : "completed";
    await runStep(trackId, "complete", async () => {
      await setTrackStatus(trackId, finalStatus, {
        error: null,
        transcriptionConfidence: Number(overall.toFixed(4)),
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await setTrackStatus(trackId, "failed", { error: message });
    throw error;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
