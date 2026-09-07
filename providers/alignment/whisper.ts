import { optionalApiKey } from "@/lib/env";
import type { AlignmentProvider, AlignmentResult } from "@/providers/types";

/**
 * Whisper word timestamps are produced during transcription.
 * This adapter exists so ALIGNMENT_PROVIDER=whisper is a real, env-selected
 * implementation. It does not invent timings; the worker applies transcription
 * word timings when this provider is selected.
 */
export class WhisperAlignmentProvider implements AlignmentProvider {
  readonly name = "whisper";

  async align(): Promise<AlignmentResult> {
    const key = optionalApiKey("ALIGNMENT_API_KEY") ?? optionalApiKey("TRANSCRIPTION_API_KEY");
    if (!key) {
      throw new Error(
        "ALIGNMENT_API_KEY (or TRANSCRIPTION_API_KEY) is not set. Alignment cannot run without a real provider key."
      );
    }
    throw new Error(
      "Whisper alignment uses word timings from transcription. The worker applies those timings; do not call align() independently."
    );
  }
}
