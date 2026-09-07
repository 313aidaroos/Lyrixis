import { createAdminClient } from "@/lib/supabase/admin";
import { HttpError } from "@/lib/errors";
import { writeAudit } from "@/lib/audit";
import { getOwnedTrack } from "@/services/tracks";
import type { AppUser, LyricLine, LyricWord } from "@/types";

interface LineRow {
  id: string;
  line_index: number;
  text: string;
  start_ms: number | null;
  end_ms: number | null;
  confidence: number | string | null;
  is_low_confidence: boolean | null;
}

interface WordRow {
  id: string;
  line_id: string;
  word_index: number;
  text: string;
  start_ms: number | null;
  end_ms: number | null;
  confidence: number | string | null;
}

function num(value: number | string | null, fallback = 0): number {
  if (value === null) return fallback;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function loadCurrentLyrics(trackId: string): Promise<{
  transcriptionId: string;
  version: number;
  fullText: string | null;
  confidence: number | null;
  lines: LyricLine[];
} | null> {
  const admin = createAdminClient();
  const { data: transcription, error } = await admin
    .from("transcriptions")
    .select("id, version, full_text, confidence")
    .eq("track_id", trackId)
    .eq("is_current", true)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "transcription_lookup_failed", error.message);
  }
  if (!transcription) return null;

  const { data: lineRows, error: lineError } = await admin
    .from("lyric_lines")
    .select("id, line_index, text, start_ms, end_ms, confidence, is_low_confidence")
    .eq("transcription_id", transcription.id)
    .order("line_index", { ascending: true });

  if (lineError) {
    throw new HttpError(500, "lines_lookup_failed", lineError.message);
  }

  const lines = (lineRows as LineRow[] | null) ?? [];
  const lineIds = lines.map((line) => line.id);
  let wordsByLine = new Map<string, WordRow[]>();

  if (lineIds.length > 0) {
    const { data: wordRows, error: wordError } = await admin
      .from("lyric_words")
      .select("id, line_id, word_index, text, start_ms, end_ms, confidence")
      .in("line_id", lineIds)
      .order("word_index", { ascending: true });
    if (wordError) {
      throw new HttpError(500, "words_lookup_failed", wordError.message);
    }
    wordsByLine = new Map();
    for (const word of (wordRows as WordRow[] | null) ?? []) {
      const list = wordsByLine.get(word.line_id) ?? [];
      list.push(word);
      wordsByLine.set(word.line_id, list);
    }
  }

  return {
    transcriptionId: transcription.id,
    version: transcription.version as number,
    fullText: transcription.full_text as string | null,
    confidence: transcription.confidence === null ? null : num(transcription.confidence as number | string),
    lines: lines.map((line) => {
      const words: LyricWord[] = (wordsByLine.get(line.id) ?? []).map((word) => ({
        text: word.text,
        startMs: num(word.start_ms),
        endMs: num(word.end_ms),
        confidence: num(word.confidence, 0.7),
        lineIndex: line.line_index,
        wordIndex: word.word_index,
      }));
      const confidence = num(line.confidence, 0.7);
      return {
        id: line.id,
        lineIndex: line.line_index,
        text: line.text,
        startMs: num(line.start_ms),
        endMs: num(line.end_ms),
        confidence,
        isLowConfidence: line.is_low_confidence ?? confidence < 0.8,
        words,
      };
    }),
  };
}

function redistributeWords(old: LyricWord[], newText: string, startMs: number, endMs: number, lineIndex: number): LyricWord[] {
  const tokens = newText.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const span = Math.max(1, endMs - startMs);
  if (old.length === tokens.length) {
    return tokens.map((text, index) => ({
      ...old[index],
      text,
      lineIndex,
      wordIndex: index,
    }));
  }
  const each = span / tokens.length;
  return tokens.map((text, index) => ({
    text,
    startMs: Math.round(startMs + index * each),
    endMs: Math.round(startMs + (index + 1) * each),
    confidence: 1,
    lineIndex,
    wordIndex: index,
  }));
}

export async function applyCorrections(input: {
  user: AppUser;
  publicId: string;
  edits: { lineIndex: number; text: string }[];
}): Promise<{ version: number }> {
  const track = await getOwnedTrack(input.user, input.publicId);
  if (track.status !== "completed" && track.status !== "manual_review") {
    throw new HttpError(409, "not_ready", "Wait until processing finishes before correcting lyrics.");
  }

  const current = await loadCurrentLyrics(track.id);
  if (!current) {
    throw new HttpError(409, "no_transcription", "No current transcription to correct.");
  }

  const editMap = new Map(input.edits.map((edit) => [edit.lineIndex, edit.text]));
  const nextLines = current.lines.map((line) => {
    const nextText = editMap.get(line.lineIndex);
    if (nextText === undefined || nextText === line.text) return line;
    const text = nextText.trim();
    return {
      ...line,
      text,
      confidence: 1,
      isLowConfidence: false,
      words: redistributeWords(line.words, text, line.startMs, line.endMs, line.lineIndex),
    };
  });

  const admin = createAdminClient();
  const nextVersion = current.version + 1;

  const { error: flipError } = await admin
    .from("transcriptions")
    .update({ is_current: false })
    .eq("id", current.transcriptionId);
  if (flipError) {
    throw new HttpError(500, "version_flip_failed", flipError.message);
  }

  const { data: created, error: createError } = await admin
    .from("transcriptions")
    .insert({
      track_id: track.id,
      version: nextVersion,
      source: "user_correction",
      provider: null,
      full_text: nextLines.map((line) => line.text).join("\n"),
      confidence: current.confidence,
      created_by: input.user.id,
      is_current: true,
    })
    .select("id")
    .single();

  if (createError || !created) {
    await admin.from("transcriptions").update({ is_current: true }).eq("id", current.transcriptionId);
    throw new HttpError(500, "correction_failed", createError?.message ?? "Could not create transcription version.");
  }

  for (const line of nextLines) {
    const { data: lineRow, error: lineError } = await admin
      .from("lyric_lines")
      .insert({
        transcription_id: created.id,
        line_index: line.lineIndex,
        text: line.text,
        start_ms: line.startMs,
        end_ms: line.endMs,
        confidence: line.confidence,
      })
      .select("id")
      .single();
    if (lineError || !lineRow) {
      throw new HttpError(500, "correction_lines_failed", lineError?.message ?? "Could not save corrected lines.");
    }
    if (line.words.length === 0) continue;
    const { error: wordError } = await admin.from("lyric_words").insert(
      line.words.map((word) => ({
        line_id: lineRow.id,
        word_index: word.wordIndex,
        text: word.text,
        start_ms: word.startMs,
        end_ms: word.endMs,
        confidence: word.confidence,
      }))
    );
    if (wordError) {
      throw new HttpError(500, "correction_words_failed", wordError.message);
    }
  }

  await writeAudit({
    actorUserId: input.user.id,
    action: "correction",
    entityType: "track",
    entityId: track.id,
    metadata: { version: nextVersion, edits: input.edits.length },
  });

  return { version: nextVersion };
}
