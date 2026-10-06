// ElevenLabs adapter (live). Gated on ELEVENLABS_API_KEY; never used without it.
// Docs: https://elevenlabs.io/docs (TTS, PVC create/samples/captcha verification/train).
// Important provider rule: a PVC may only be created of the account owner's OWN voice. A creator's
// voice must be verified by the creator reading the CAPTCHA themselves, or come from the creator's
// own ElevenLabs account (share link). Reselling access needs ElevenLabs' written authorization
// (OEM / enterprise terms). See docs/voices/PROVIDER_FINDINGS.md before turning this on.
import type { SynthesisInput, SynthesisResult, VoiceProvider, VerificationStart, VerificationResult } from "./types";
import { ProviderError } from "./types";

const BASE = (process.env.ELEVENLABS_API_BASE ?? "https://api.elevenlabs.io").replace(/\/$/, "");

function key(): string {
  const k = process.env.ELEVENLABS_API_KEY ?? "";
  if (k.length < 20) throw new ProviderError("not_configured", "ELEVENLABS_API_KEY is not set", false);
  return k;
}
function model(input?: string | null): string {
  return input || process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
}
/** USD per 1,000 characters on the API plan (default $0.10 Multilingual v2/v3). */
function usdPer1k(): number {
  const n = Number(process.env.ELEVENLABS_USD_PER_1K_CHARS ?? "0.10");
  return Number.isFinite(n) && n >= 0 ? n : 0.1;
}

async function el(path: string, init: RequestInit & { signal?: AbortSignal }): Promise<Response> {
  const apiKey = key(); // throws not_configured before any network call
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers: { "xi-api-key": apiKey, ...(init.headers ?? {}) }, cache: "no-store" });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new ProviderError("timeout", "ElevenLabs request timed out", true);
    throw new ProviderError("network", "ElevenLabs unreachable", true);
  }
  if (!res.ok) {
    const retryable = res.status === 429 || res.status >= 500;
    // Never log the body: it can echo script text.
    throw new ProviderError(`http_${res.status}`, `ElevenLabs ${res.status}`, retryable);
  }
  return res;
}

function form(fields: Record<string, string>, files: { field: string; name: string; body: Uint8Array; mime: string }[]): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  for (const file of files) f.append(file.field, new Blob([file.body as BlobPart], { type: file.mime }), file.name);
  return f;
}

export function createElevenLabsProvider(): VoiceProvider {
  return {
    id: "elevenlabs",
    isDemo: false,
    label: "ElevenLabs",
    supportsPronunciationDictionary: true,
    configured: () => (process.env.ELEVENLABS_API_KEY ?? "").length >= 20,

    async synthesize(input: SynthesisInput): Promise<SynthesisResult> {
      if (input.providerVoiceRef.startsWith("demo:")) throw new ProviderError("ref_mismatch", "Demo voice refs are never sent to a live provider", false);
      const chars = Array.from(input.text).length;
      const res = await el(`/v1/text-to-speech/${encodeURIComponent(input.providerVoiceRef)}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "audio/mpeg" },
        body: JSON.stringify({ text: input.text, model_id: model(input.modelVersion), language_code: input.language === "ar" ? "ar" : undefined }),
        signal: input.signal,
      });
      const audio = new Uint8Array(await res.arrayBuffer());
      // 128 kbps MP3 ≈ 16,000 bytes/s
      const seconds = Math.round((audio.byteLength / 16000) * 10) / 10;
      return { audio, mime: "audio/mpeg", seconds, chars, costUsdMicros: Math.ceil((chars / 1000) * usdPer1k() * 1_000_000), isDemo: false };
    },

    async createVoice({ name, language, description, files }) {
      const res = await el(`/v1/voices/pvc`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, language, description }) });
      const { voice_id } = (await res.json()) as { voice_id: string };
      if (!voice_id) throw new ProviderError("bad_response", "ElevenLabs returned no voice_id", false);
      await el(`/v1/voices/pvc/${encodeURIComponent(voice_id)}/samples`, { method: "POST", body: form({}, files.map((f) => ({ field: "files", ...f }))) });
      return { providerVoiceRef: voice_id };
    },

    async startVerification(ref: string): Promise<VerificationStart> {
      const res = await el(`/v1/voices/pvc/${encodeURIComponent(ref)}/captcha`, { method: "GET" });
      const text = await res.text();
      let b64 = text;
      try { const j = JSON.parse(text) as unknown; if (typeof j === "string") b64 = j; } catch { /* raw base64 */ }
      return { method: "captcha", challengeImagePngBase64: b64.replace(/^"|"$/g, "") };
    },

    async submitVerification(ref, recording): Promise<VerificationResult> {
      await el(`/v1/voices/pvc/${encodeURIComponent(ref)}/captcha`, { method: "POST", body: form({}, [{ field: "recording", name: "captcha-recording", ...recording }]) });
      const state = await getVoice(ref);
      return { status: state.verified ? "passed" : "pending", detail: state.verified ? "ElevenLabs verified the voice owner" : "Submitted; ElevenLabs has not confirmed yet" };
    },

    async requestManualVerification(ref, files): Promise<VerificationResult> {
      await el(`/v1/voices/pvc/${encodeURIComponent(ref)}/verification`, { method: "POST", body: form({}, files.map((f) => ({ field: "files", ...f }))) });
      return { status: "pending", detail: "Manual verification requested at ElevenLabs" };
    },

    async train(ref, modelId) {
      await el(`/v1/voices/pvc/${encodeURIComponent(ref)}/train`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model_id: model(modelId) }) });
      return { started: true };
    },

    async trainingState(ref, modelId) {
      const v = await getVoice(ref);
      const s = v.fineTuning?.[model(modelId)];
      if (s === "fine_tuned" || s === "failed" || s === "queued" || s === "fine_tuning" || s === "not_started") return s;
      return "not_started";
    },
  };
}

async function getVoice(ref: string): Promise<{ verified: boolean; fineTuning?: Record<string, string> }> {
  const res = await el(`/v1/voices/${encodeURIComponent(ref)}`, { method: "GET" });
  const j = (await res.json()) as { fine_tuning?: { state?: Record<string, string>; verification_attempts?: unknown[]; is_allowed_to_fine_tune?: boolean }; verification?: { requires_verification?: boolean; is_verified?: boolean } };
  const verified = j.verification ? !!j.verification.is_verified || j.verification.requires_verification === false : !!j.fine_tuning?.is_allowed_to_fine_tune;
  return { verified, fineTuning: j.fine_tuning?.state };
}
