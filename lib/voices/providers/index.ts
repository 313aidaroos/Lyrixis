import type { VoiceProvider } from "./types";
import { createDemoProvider } from "./demo";
import { createElevenLabsProvider } from "./elevenlabs";

export * from "./types";

/**
 * Resolve the adapter for a voice. A voice is bound to ONE provider and ONE provider ref.
 * There is no fallback: if that provider is unavailable the job fails clearly — we never
 * substitute another provider or another person's voice.
 */
export function providerFor(voiceProvider: string | null, registry: Record<string, VoiceProvider> = defaultRegistry()): VoiceProvider | null {
  if (!voiceProvider) return null;
  return registry[voiceProvider] ?? null;
}

export function defaultRegistry(): Record<string, VoiceProvider> {
  return { demo: createDemoProvider(), elevenlabs: createElevenLabsProvider() };
}
