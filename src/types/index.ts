export type AccountType =
  | "individual"
  | "company"
  | "label"
  | "distributor"
  | "ddex";

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
}

export interface LyricLine {
  lineIndex: number;
  text: string;
  startMs: number;
  endMs: number;
  confidence: number;
  words: LyricWord[];
}

export interface TrackSection {
  label: string;
  startMs: number;
  endMs: number;
  confidence: number;
}

export interface TrackMetadata {
  album?: string;
  isrc?: string;
  upc?: string;
  label?: string;
  publisher?: string;
  songwriters?: string[];
  source: string;
}

export interface IntelligencePackage {
  trackId: string;
  publicId: string;
  status: TrackStatus;
  title: string;
  artist: string;
  durationSeconds: number;
  language: string;
  languageConfidence: number;
  dialect?: string;
  dialectConfidence?: number;
  confidenceBand: ConfidenceBand;
  explicit: "clean" | "explicit" | "possibly_explicit" | "unknown";
  verification: string;
  lyrics: LyricLine[];
  structure: TrackSection[];
  metadata: TrackMetadata;
  accountType: AccountType;
  notifyEmail?: string;
  createdAt: string;
  completedAt?: string;
}

export interface UploadInput {
  audioBuffer: Buffer;
  filename: string;
  mimeType: string;
  title?: string;
  artist?: string;
  accountType: AccountType;
  rightsConfirmed: boolean;
  notifyEmail?: string;
  metadata?: Partial<TrackMetadata>;
  ddexXml?: string;
}
