import { HttpError } from "@/lib/errors";
import { getMaxUploadBytes } from "@/lib/env";

const ALLOWED_MIME = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/flac",
  "audio/x-flac",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
  "audio/ogg",
  "audio/opus",
  "application/octet-stream",
]);

export interface DetectedAudio {
  mime: string;
  extension: string;
}

function startsWith(bytes: Buffer, ascii: string, offset = 0): boolean {
  return bytes.toString("ascii", offset, offset + ascii.length) === ascii;
}

export function detectAudioMagic(bytes: Buffer): DetectedAudio | null {
  if (bytes.length < 12) return null;

  if (startsWith(bytes, "ID3") || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) {
    return { mime: "audio/mpeg", extension: "mp3" };
  }
  if (startsWith(bytes, "RIFF") && startsWith(bytes, "WAVE", 8)) {
    return { mime: "audio/wav", extension: "wav" };
  }
  if (startsWith(bytes, "fLaC")) {
    return { mime: "audio/flac", extension: "flac" };
  }
  if (startsWith(bytes, "OggS")) {
    return { mime: "audio/ogg", extension: "ogg" };
  }
  if (startsWith(bytes, "ftyp", 4)) {
    return { mime: "audio/mp4", extension: "m4a" };
  }
  return null;
}

export function validateUpload(input: {
  filename: string;
  declaredMime: string;
  bytes: Buffer;
}): DetectedAudio {
  if (input.bytes.length === 0) {
    throw new HttpError(400, "empty_file", "The audio file is empty.");
  }
  if (input.bytes.length > getMaxUploadBytes()) {
    throw new HttpError(
      413,
      "file_too_large",
      `File exceeds the ${Math.round(getMaxUploadBytes() / (1024 * 1024))} MB upload cap.`
    );
  }

  const declared = input.declaredMime.toLowerCase();
  if (declared && !ALLOWED_MIME.has(declared)) {
    throw new HttpError(
      415,
      "unsupported_media_type",
      `Unsupported MIME type: ${input.declaredMime}. Use MP3, WAV, FLAC, M4A, or OGG.`
    );
  }

  const detected = detectAudioMagic(input.bytes);
  if (!detected) {
    throw new HttpError(
      415,
      "invalid_audio",
      "File did not match a known audio signature (magic bytes)."
    );
  }

  return detected;
}
