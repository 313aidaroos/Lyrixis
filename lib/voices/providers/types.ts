// Voice provider adapter interface. Provider refs (voice ids, keys) stay server-side.
export interface SynthesisInput {
  providerVoiceRef: string;
  text: string;
  language: string;          // 'ar' | 'en'
  dialect?: string | null;
  modelVersion?: string | null;
  signal?: AbortSignal;
}
export interface SynthesisResult {
  audio: Uint8Array;
  mime: string;
  seconds: number;
  chars: number;
  costUsdMicros: number;
  /** true when the audio is a demo placeholder, never a real voice */
  isDemo: boolean;
}
export type VerificationStart = { method: "captcha"; challengeImagePngBase64: string } | { method: "manual_only"; reason: string };
export type VerificationResult = { status: "passed" | "failed" | "pending"; detail?: string };

export class ProviderError extends Error {
  code: string; retryable: boolean;
  constructor(code: string, message: string, retryable: boolean) { super(message); this.code = code; this.retryable = retryable; }
}

export interface VoiceProvider {
  readonly id: string;
  readonly isDemo: boolean;
  readonly label: string;
  /** Provider-side pronunciation dictionaries. If false, Lyrixis applies alias substitution itself. */
  readonly supportsPronunciationDictionary: boolean;
  configured(): boolean;
  synthesize(input: SynthesisInput): Promise<SynthesisResult>;
  /** Create a provider voice for a creator from private training audio (PVC). */
  createVoice?(input: { name: string; language: string; description?: string; files: { name: string; body: Uint8Array; mime: string }[] }): Promise<{ providerVoiceRef: string }>;
  startVerification?(providerVoiceRef: string): Promise<VerificationStart>;
  submitVerification?(providerVoiceRef: string, recording: { body: Uint8Array; mime: string }): Promise<VerificationResult>;
  requestManualVerification?(providerVoiceRef: string, files: { name: string; body: Uint8Array; mime: string }[]): Promise<VerificationResult>;
  train?(providerVoiceRef: string, modelId?: string): Promise<{ started: boolean }>;
  trainingState?(providerVoiceRef: string, modelId?: string): Promise<"not_started" | "queued" | "fine_tuning" | "fine_tuned" | "failed">;
}
