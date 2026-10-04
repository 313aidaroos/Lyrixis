import { RESERVED_NAME_PATTERNS, SAMPLE_MAX_BYTES, SAMPLE_MIME, TRAINING_MAX_BYTES, TRAINING_MIME } from "./config";
import { bad } from "./errors";

/** Sniff the real container type from magic bytes; never trust the declared MIME alone. */
export function sniffAudio(b: Uint8Array): string | null {
  const s = (o: number, n: number) => String.fromCharCode(...Array.from(b.slice(o, o + n)));
  if (b.length < 12) return null;
  if (s(0, 4) === "RIFF" && s(8, 4) === "WAVE") return "audio/wav";
  if (s(0, 3) === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return "audio/mpeg";
  if (s(0, 4) === "fLaC") return "audio/flac";
  if (s(0, 4) === "OggS") return "audio/ogg";
  if (s(4, 4) === "ftyp") return "audio/mp4";
  return null;
}

function normMime(m: string) { return m === "audio/x-wav" || m === "audio/wave" ? "audio/wav" : m === "audio/mp3" ? "audio/mpeg" : m === "audio/x-m4a" || m === "audio/m4a" ? "audio/mp4" : m; }

export function validateUpload(kind: "sample" | "training", declaredMime: string, body: Uint8Array): { mime: string } {
  const allowed = (kind === "sample" ? SAMPLE_MIME : TRAINING_MIME) as readonly string[];
  const max = kind === "sample" ? SAMPLE_MAX_BYTES : TRAINING_MAX_BYTES;
  if (body.byteLength === 0) throw bad("empty_file", "The file is empty.");
  if (body.byteLength > max) throw bad("file_too_large", `Max ${Math.round(max / 1048576)} MB.`);
  const sniffed = sniffAudio(body);
  const declared = normMime(declaredMime);
  if (!sniffed || !allowed.map(normMime).includes(sniffed)) throw bad("unsupported_type", `Allowed: ${allowed.join(", ")}.`);
  if (declared && declared !== sniffed) throw bad("type_mismatch", "The file's contents don't match its type.");
  return { mime: sniffed };
}

/** Anti-impersonation: reserved words, brand names, titles. Admin review covers the rest. */
export function assertAllowedName(name: string): void {
  const n = name.normalize("NFC").trim();
  if (n.length < 2 || n.length > 80) throw bad("bad_name", "Name must be 2–80 characters.");
  if (RESERVED_NAME_PATTERNS.some((re) => re.test(n))) throw bad("reserved_name", "That name suggests an official, branded or public figure. Use your own name or a plain stage name.");
}

export function similarName(a: string, b: string): boolean {
  const f = (s: string) => s.normalize("NFKD").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  return f(a) !== "" && f(a) === f(b);
}

/** Simple PCM WAV duration (other formats: duration supplied by the client and re-checked in review). */
export function wavSeconds(b: Uint8Array): number | null {
  if (sniffAudio(b) !== "audio/wav" || b.length < 44) return null;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const byteRate = v.getUint32(28, true);
  return byteRate ? Math.round(((b.byteLength - 44) / byteRate) * 10) / 10 : null;
}
