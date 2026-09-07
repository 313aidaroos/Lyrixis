import { createReadStream } from "fs";
import { stat } from "fs/promises";
import {
  getTranscriptionApiBaseUrl,
  getTranscriptionApiKey,
  getTranscriptionCentsPerMinute,
  getTranscriptionModel,
} from "@/lib/env";
import { mean } from "@/lib/utils";
import type {
  TranscribedLine,
  TranscriptionProvider,
  TranscriptionResult,
  WordTiming,
} from "@/providers/types";

interface WhisperWord {
  word: string;
  start: number;
  end: number;
  probability?: number;
}

interface WhisperSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  avg_logprob?: number;
  no_speech_prob?: number;
}

interface WhisperVerboseJson {
  text: string;
  language?: string;
  duration?: number;
  segments?: WhisperSegment[];
  words?: WhisperWord[];
}

function logprobToConfidence(logprob: number | undefined): number {
  if (logprob === undefined) return 0.75;
  const clamped = Math.max(-5, Math.min(0, logprob));
  return Number((1 + clamped / 5).toFixed(4));
}

function usageCostCents(durationSeconds: number, centsPerMinute: number): number {
  const minutes = durationSeconds / 60;
  return Number((minutes * centsPerMinute).toFixed(4));
}

function assignWordsToLines(
  lines: TranscribedLine[],
  words: { text: string; startMs: number; endMs: number; confidence: number }[]
): WordTiming[] {
  return words.map((word) => {
    let lineIndex = 0;
    let best = Number.POSITIVE_INFINITY;
    lines.forEach((line, index) => {
      const overlap = Math.min(line.endMs, word.endMs) - Math.max(line.startMs, word.startMs);
      const distance = overlap > 0 ? -overlap : Math.min(
        Math.abs(word.startMs - line.startMs),
        Math.abs(word.startMs - line.endMs)
      );
      if (distance < best) {
        best = distance;
        lineIndex = index;
      }
    });
    return { ...word, lineIndex };
  });
}

function fallbackWordsFromLine(line: TranscribedLine, lineIndex: number): WordTiming[] {
  const tokens = line.text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const span = Math.max(1, line.endMs - line.startMs);
  const each = span / tokens.length;
  return tokens.map((text, index) => ({
    text,
    startMs: Math.round(line.startMs + index * each),
    endMs: Math.round(line.startMs + (index + 1) * each),
    confidence: line.confidence,
    lineIndex,
  }));
}

export class WhisperV3Provider implements TranscriptionProvider {
  readonly name = "whisper_v3";

  async transcribe(input: {
    audioPath: string;
    languageHint?: string;
  }): Promise<TranscriptionResult> {
    const apiKey = getTranscriptionApiKey();
    const fileStat = await stat(input.audioPath);
    if (fileStat.size === 0) {
      throw new Error("Normalized audio file is empty.");
    }

    const form = new FormData();
    const blob = await fileToBlob(input.audioPath);
    form.append("file", blob, "audio.wav");
    form.append("model", getTranscriptionModel());
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "word");
    form.append("timestamp_granularities[]", "segment");
    if (input.languageHint) {
      form.append("language", input.languageHint);
    }

    const response = await fetch(`${getTranscriptionApiBaseUrl()}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Transcription provider error (${response.status}): ${detail}`);
    }

    const data = (await response.json()) as WhisperVerboseJson;
    const segments = data.segments ?? [];
    const lines: TranscribedLine[] = segments.map((segment) => ({
      text: segment.text.trim(),
      startMs: Math.round(segment.start * 1000),
      endMs: Math.round(segment.end * 1000),
      confidence: logprobToConfidence(segment.avg_logprob),
    })).filter((line) => line.text.length > 0);

    const rawWords = (data.words ?? []).map((word) => ({
      text: word.word.trim(),
      startMs: Math.round(word.start * 1000),
      endMs: Math.round(word.end * 1000),
      confidence: word.probability ?? 0.75,
    })).filter((word) => word.text.length > 0);

    const words =
      rawWords.length > 0
        ? assignWordsToLines(lines, rawWords)
        : lines.flatMap((line, index) => fallbackWordsFromLine(line, index));

    const duration = typeof data.duration === "number"
      ? data.duration
      : (lines.at(-1)?.endMs ?? 0) / 1000;
    const centsPerMinute = getTranscriptionCentsPerMinute();
    const languageConfidence = mean(
      words.map((word) => word.confidence).concat(lines.map((line) => line.confidence))
    );

    return {
      text: data.text?.trim() || lines.map((line) => line.text).join("\n"),
      lines,
      words,
      language: data.language ?? "und",
      languageConfidence: Number(languageConfidence.toFixed(4)) || 0.5,
      costCents: usageCostCents(duration, centsPerMinute),
      provider: `${this.name}:${getTranscriptionModel()}`,
      usage: { durationSeconds: duration, centsPerMinute },
    };
  }
}

async function fileToBlob(path: string): Promise<Blob> {
  const stream = createReadStream(path);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  const bytes = new Uint8Array(buffer);
  return new Blob([bytes], { type: "audio/wav" });
}
