import { LyricLine } from "@/types";

export interface TranscriptionResult {
  text: string;
  lines: LyricLine[];
  language: string;
  languageConfidence: number;
  costCents: number;
}

export interface TranscriptionProvider {
  name: string;
  transcribe(input: {
    audioPath: string;
    languageHint?: string;
    durationSeconds: number;
    title?: string;
    artist?: string;
  }): Promise<TranscriptionResult>;
}
