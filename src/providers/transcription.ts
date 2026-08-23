import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { TranscriptionProvider, TranscriptionResult } from "./types";
import { LyricLine } from "@/types";

const execFileAsync = promisify(execFile);

async function transcribeWithOpenAI(
  audioPath: string,
  languageHint?: string
): Promise<TranscriptionResult> {
  const apiKey = process.env.TRANSCRIPTION_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("No transcription API key");

  const form = new FormData();
  const buffer = fs.readFileSync(audioPath);
  const blob = new Blob([buffer], { type: "audio/wav" });
  form.append("file", blob, "audio.wav");
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  form.append("timestamp_granularities[]", "segment");
  if (languageHint) form.append("language", languageHint);

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Whisper API error: ${err}`);
  }

  const data = (await res.json()) as {
    text: string;
    language: string;
    segments?: {
      id: number;
      start: number;
      end: number;
      text: string;
      avg_logprob?: number;
    }[];
    words?: {
      word: string;
      start: number;
      end: number;
      probability?: number;
    }[];
  };

  const lines: LyricLine[] = (data.segments || []).map((seg, i) => {
    const segWords = (data.words || []).filter(
      (w) => w.start >= seg.start - 0.05 && w.end <= seg.end + 0.05
    );
    const words =
      segWords.length > 0
        ? segWords.map((w, wi) => ({
            text: w.word.trim(),
            startMs: Math.round(w.start * 1000),
            endMs: Math.round(w.end * 1000),
            confidence: w.probability ?? 0.75,
          }))
        : seg.text
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map((word, wi, arr) => {
              const span = (seg.end - seg.start) / arr.length;
              const start = seg.start + wi * span;
              return {
                text: word,
                startMs: Math.round(start * 1000),
                endMs: Math.round((start + span) * 1000),
                confidence: 0.7,
              };
            });

    const conf =
      seg.avg_logprob !== undefined
        ? Math.min(0.99, Math.max(0.3, Math.exp(seg.avg_logprob)))
        : 0.75;

    return {
      lineIndex: i,
      text: seg.text.trim(),
      startMs: Math.round(seg.start * 1000),
      endMs: Math.round(seg.end * 1000),
      confidence: conf,
      words,
    };
  });

  const durationMin = lines.length > 0 ? lines[lines.length - 1].endMs / 60000 : 1;
  const costCents = Math.ceil(durationMin * 0.6);

  return {
    text: data.text.trim(),
    lines,
    language: data.language || "en",
    languageConfidence: 0.9,
    costCents,
  };
}

function buildDemoTranscription(
  title: string,
  artist: string,
  durationSeconds: number
): TranscriptionResult {
  const phrases = [
    `On the long road we sing together`,
    `${artist} carries the melody through the night`,
    `Every word a story, every note a light`,
    `Music understood — ${title}`,
  ];
  const lineDuration = (durationSeconds * 1000) / phrases.length;
  const lines: LyricLine[] = phrases.map((text, i) => {
    const startMs = Math.round(i * lineDuration);
    const endMs = Math.round((i + 1) * lineDuration - 100);
    const wordParts = text.split(/\s+/);
    const wordSpan = (endMs - startMs) / wordParts.length;
    const words = wordParts.map((word, wi) => ({
      text: word,
      startMs: Math.round(startMs + wi * wordSpan),
      endMs: Math.round(startMs + (wi + 1) * wordSpan),
      confidence: 0.72,
    }));
    return {
      lineIndex: i,
      text,
      startMs,
      endMs,
      confidence: 0.72,
      words,
    };
  });

  return {
    text: phrases.join("\n"),
    lines,
    language: "en",
    languageConfidence: 0.72,
    costCents: 0,
  };
}

export const whisperProvider: TranscriptionProvider = {
  name: "whisper_v3",
  async transcribe({ audioPath, languageHint, durationSeconds, title, artist }) {
    const hasKey =
      !!(process.env.TRANSCRIPTION_API_KEY || process.env.OPENAI_API_KEY);

    if (hasKey) {
      let wavPath = audioPath;
      if (!audioPath.endsWith(".wav")) {
        wavPath = audioPath.replace(/\.[^.]+$/, ".wav");
        await execFileAsync("ffmpeg", [
          "-y",
          "-i",
          audioPath,
          "-ar",
          "16000",
          "-ac",
          "1",
          wavPath,
        ]);
      }
      return transcribeWithOpenAI(wavPath, languageHint);
    }

    return buildDemoTranscription(
      title || "Untitled",
      artist || "Unknown Artist",
      durationSeconds
    );
  },
};

export function getTranscriptionProvider(): TranscriptionProvider {
  const name = process.env.TRANSCRIPTION_PROVIDER || "whisper_v3";
  if (name === "whisper_v3" || name === "whisper") return whisperProvider;
  return whisperProvider;
}
