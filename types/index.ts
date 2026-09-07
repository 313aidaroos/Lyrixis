export type TrackStatus =
  | "uploaded"
  | "queued"
  | "processing"
  | "transcribing"
  | "aligning"
  | "analyzing"
  | "completed"
  | "failed"
  | "manual_review";

export type ConfidenceBand = "high" | "medium" | "review";

export interface LyricWord {
  text: string;
  startMs: number;
  endMs: number;
  confidence: number;
  lineIndex: number;
  wordIndex: number;
}

export interface LyricLine {
  id?: string;
  lineIndex: number;
  text: string;
  startMs: number;
  endMs: number;
  confidence: number;
  isLowConfidence: boolean;
  words: LyricWord[];
}

export interface AppUser {
  id: string;
  authId: string;
  email: string;
  fullName: string | null;
  stripeCustomerId: string | null;
}

export interface TrackSummary {
  id: string;
  publicId: string;
  title: string | null;
  artist: string | null;
  status: TrackStatus;
  durationSeconds: number | null;
  language: string | null;
  paid: boolean;
  transcriptionConfidence: number | null;
  confidenceBand: ConfidenceBand | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface TrackDetail extends TrackSummary {
  dialect: string | null;
  languageConfidence: number | null;
  rightsConfirmed: boolean;
  rightsConfirmedAt: string | null;
  preview: boolean;
  watermarked: boolean;
  lines: LyricLine[];
  fullText: string | null;
  transcriptionVersion: number | null;
}

export type ExportFormat = "txt" | "srt" | "lrc" | "json";

export interface JsonExportPayload {
  publicId: string;
  title: string | null;
  artist: string | null;
  durationSeconds: number | null;
  language: string | null;
  dialect: string | null;
  confidenceBand: ConfidenceBand | null;
  transcriptionConfidence: number | null;
  lines: LyricLine[];
}

export interface QuoteResult {
  songCount: number;
  rateCents: number;
  amountCents: number;
  source: "custom" | "tier";
  /** How the tier was chosen. Documented so customers can ask. */
  basis: "job_size";
}
