// DEMO adapter. Produces a short synthetic tone sequence (WAV), NOT a voice. Labeled demo everywhere.
import type { SynthesisInput, SynthesisResult, VoiceProvider } from "./types";
import { ProviderError } from "./types";
import { estimateSeconds } from "../pricing";

const RATE = 8000;

/** Build a small mono 16-bit PCM WAV: a pitch contour derived from the text (deterministic). */
export function demoWav(text: string, seconds: number, baseHz = 220): Uint8Array {
  const dur = Math.max(1, Math.min(seconds, 20));
  const n = Math.floor(RATE * dur);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, RATE, true); v.setUint32(28, RATE * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 2, true);
  const codes = Array.from(text.normalize("NFC")).map((c) => c.codePointAt(0) ?? 0);
  const step = Math.floor(RATE * 0.18);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const c = codes.length ? codes[Math.floor(i / step) % codes.length] : 0;
    const hz = baseHz + (c % 12) * 18;
    phase += (2 * Math.PI * hz) / RATE;
    const env = Math.sin((Math.PI * (i % step)) / step) * 0.25;
    v.setInt16(44 + i * 2, Math.round(Math.sin(phase) * env * 32767), true);
  }
  return new Uint8Array(buf);
}

export function createDemoProvider(opts: { failTimes?: number; delayMs?: number } = {}): VoiceProvider {
  let failures = opts.failTimes ?? 0;
  return {
    id: "demo",
    isDemo: true,
    label: "Demo adapter (synthetic tone — not a real voice)",
    supportsPronunciationDictionary: false,
    configured: () => true,
    async synthesize(input: SynthesisInput): Promise<SynthesisResult> {
      if (!input.providerVoiceRef.startsWith("demo:")) throw new ProviderError("ref_mismatch", "Demo adapter only serves demo voices", false);
      if (opts.delayMs) await new Promise((r, j) => { const t = setTimeout(r, opts.delayMs); input.signal?.addEventListener("abort", () => { clearTimeout(t); j(new ProviderError("timeout", "Demo synthesis timed out", true)); }); });
      if (failures > 0) { failures -= 1; throw new ProviderError("demo_failure", "Simulated provider failure (demo)", true); }
      const seconds = estimateSeconds(input.text);
      const base = 160 + (Array.from(input.providerVoiceRef).reduce((s, c) => s + c.charCodeAt(0), 0) % 120);
      return { audio: demoWav(input.text, seconds, base), mime: "audio/wav", seconds: Math.min(seconds, 20), chars: Array.from(input.text).length, costUsdMicros: 0, isDemo: true };
    },
    async startVerification() { return { method: "manual_only", reason: "Demo adapter has no provider verification; use the admin review queue." }; },
  };
}
