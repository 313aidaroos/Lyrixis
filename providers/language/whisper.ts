import { optionalApiKey } from "@/lib/env";
import type { LanguageProvider, LanguageResult } from "@/providers/types";

/**
 * Uses Whisper's language identification from the transcription call.
 * When `prior` is provided (the transcription result), this records $0 extra
 * because that usage was already billed on the transcription request.
 * If `prior` is missing, this adapter refuses rather than inventing a language.
 */
export class WhisperLanguageProvider implements LanguageProvider {
  readonly name = "whisper";

  async detect(input: {
    audioPath: string;
    languageHint?: string;
    prior?: { language: string; confidence: number };
  }): Promise<LanguageResult> {
    const key = optionalApiKey("LANGUAGE_API_KEY") ?? optionalApiKey("TRANSCRIPTION_API_KEY");
    if (!key) {
      throw new Error(
        "LANGUAGE_API_KEY (or TRANSCRIPTION_API_KEY) is not set. Language ID cannot run without a real provider key."
      );
    }

    if (!input.prior?.language) {
      throw new Error(
        "Whisper language provider requires language from the transcription result. The transcription step must succeed first."
      );
    }

    return {
      language: input.prior.language,
      confidence: input.prior.confidence,
      costCents: 0,
      provider: this.name,
    };
  }
}
