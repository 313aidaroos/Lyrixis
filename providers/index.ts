import { WhisperAlignmentProvider } from "@/providers/alignment/whisper";
import { WhisperLanguageProvider } from "@/providers/language/whisper";
import { WhisperV3Provider } from "@/providers/transcription/whisper-v3";
import {
  getAlignmentProviderName,
  getLanguageProviderName,
  getTranscriptionProviderName,
  optionalApiKey,
} from "@/lib/env";
import type {
  AlignmentProvider,
  AudioAnalysisProvider,
  LanguageProvider,
  TranscriptionProvider,
  TranslationProvider,
} from "@/providers/types";

function missingKeyError(kind: string, envName: string): Error {
  return new Error(
    `${kind} provider key is missing (${envName}). Stub/mock providers are not available on shipped paths.`
  );
}

export function getTranscriptionProvider(): TranscriptionProvider {
  const name = getTranscriptionProviderName();
  if (name === "whisper_v3" || name === "whisper") {
    if (!optionalApiKey("TRANSCRIPTION_API_KEY")) {
      throw missingKeyError("Transcription", "TRANSCRIPTION_API_KEY");
    }
    return new WhisperV3Provider();
  }
  throw new Error(
    `Unknown TRANSCRIPTION_PROVIDER="${name}". Supported: whisper_v3.`
  );
}

export function getLanguageProvider(): LanguageProvider {
  const name = getLanguageProviderName();
  if (name === "whisper") {
    if (!optionalApiKey("LANGUAGE_API_KEY") && !optionalApiKey("TRANSCRIPTION_API_KEY")) {
      throw missingKeyError("Language", "LANGUAGE_API_KEY or TRANSCRIPTION_API_KEY");
    }
    return new WhisperLanguageProvider();
  }
  throw new Error(`Unknown LANGUAGE_PROVIDER="${name}". Supported: whisper.`);
}

export function getAlignmentProvider(): AlignmentProvider | null {
  const name = getAlignmentProviderName();
  if (!name) return null;
  if (name === "whisper") {
    if (!optionalApiKey("ALIGNMENT_API_KEY") && !optionalApiKey("TRANSCRIPTION_API_KEY")) {
      throw missingKeyError("Alignment", "ALIGNMENT_API_KEY or TRANSCRIPTION_API_KEY");
    }
    return new WhisperAlignmentProvider();
  }
  throw new Error(`Unknown ALIGNMENT_PROVIDER="${name}". Supported: whisper (or leave unset).`);
}

export function getTranslationProvider(): TranslationProvider {
  throw new Error("Translation is deferred and is not wired in the MVP.");
}

export function getAudioAnalysisProvider(): AudioAnalysisProvider {
  throw new Error("Audio analysis is deferred and is not wired in the MVP.");
}
