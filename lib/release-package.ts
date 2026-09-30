/**
 * Release Tool v1 — pure release-package builders.
 *
 * No I/O, no Node-only APIs: everything here is unit-testable and safe to
 * import anywhere. The zip writer is store-only (no compression) so it needs
 * no new dependencies: just CRC32 + local/central directory records.
 */

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const textEncoder = new TextEncoder();

function dosDateTime(date: Date): { time: number; date: number } {
  const time =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((Math.floor(date.getSeconds() / 2) & 0x1f) << 0);
  const day =
    (((date.getFullYear() - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0x0f) << 5) |
    ((date.getDate() & 0x1f) << 0);
  return { time, date: day };
}

/** Minimal store-only ZIP. Returns the complete archive bytes. */
export function createZip(entries: ZipEntry[], modifiedAt: Date = new Date()): Uint8Array {
  if (entries.length > 0xffff) {
    throw new Error("Too many entries for a minimal zip.");
  }
  const { time, date } = dosDateTime(modifiedAt);
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  const pushU16 = (bytes: number[], value: number) => {
    bytes.push(value & 0xff, (value >>> 8) & 0xff);
  };
  const pushU32 = (bytes: number[], value: number) => {
    bytes.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
  };

  for (const entry of entries) {
    const nameBytes = textEncoder.encode(entry.name);
    if (nameBytes.length > 0xffff) throw new Error(`Entry name too long: ${entry.name}`);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const local: number[] = [];
    pushU32(local, 0x04034b50); // local file header signature
    pushU16(local, 20); // version needed
    pushU16(local, 0x0800); // UTF-8 filenames
    pushU16(local, 0); // method: store
    pushU16(local, time);
    pushU16(local, date);
    pushU32(local, crc);
    pushU32(local, size);
    pushU32(local, size);
    pushU16(local, nameBytes.length);
    pushU16(local, 0); // extra length
    const localHeader = new Uint8Array([...local, ...nameBytes]);
    chunks.push(localHeader, entry.data);

    const dir: number[] = [];
    pushU32(dir, 0x02014b50); // central directory signature
    pushU16(dir, 20); // version made by
    pushU16(dir, 20); // version needed
    pushU16(dir, 0x0800);
    pushU16(dir, 0);
    pushU16(dir, time);
    pushU16(dir, date);
    pushU32(dir, crc);
    pushU32(dir, size);
    pushU32(dir, size);
    pushU16(dir, nameBytes.length);
    pushU16(dir, 0); // extra
    pushU16(dir, 0); // comment
    pushU16(dir, 0); // disk number
    pushU16(dir, 0); // internal attrs
    pushU32(dir, 0); // external attrs
    pushU32(dir, offset); // local header offset
    central.push(new Uint8Array([...dir, ...nameBytes]));

    offset += localHeader.length + size;
  }

  const centralStart = offset;
  let centralSize = 0;
  for (const record of central) {
    chunks.push(record);
    centralSize += record.length;
  }

  const end: number[] = [];
  pushU32(end, 0x06054b50); // end of central directory
  pushU16(end, 0);
  pushU16(end, 0);
  pushU16(end, entries.length);
  pushU16(end, entries.length);
  pushU32(end, centralSize);
  pushU32(end, centralStart);
  pushU16(end, 0); // comment length
  chunks.push(new Uint8Array(end));

  const total = chunks.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const part of chunks) {
    out.set(part, cursor);
    cursor += part.length;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Package file builders
// ---------------------------------------------------------------------------

export interface PackageSplit {
  name: string;
  role: string;
  percentage: number;
  email?: string | null;
}

export interface PackageMetadata {
  title: string;
  primaryArtist: string;
  featuredArtists: string[];
  releaseType: string;
  isrc: string | null;
  iswc: string | null;
  upc: string | null;
  /** Human-readable formatted codes (or null when missing). */
  isrcFormatted: string | null;
  iswcFormatted: string | null;
  verifiedAt: string | null;
  generatedAt: string;
}

export function buildSplitSheetText(input: {
  title: string;
  primaryArtist: string;
  splits: PackageSplit[];
  generatedAt: string;
}): string {
  const total = input.splits.reduce((sum, split) => sum + split.percentage, 0);
  const rows = input.splits
    .map((split) => {
      const email = split.email ? ` <${split.email}>` : "";
      return `- ${split.name}${email} — ${split.role}: ${split.percentage}%`;
    })
    .join("\n");
  return [
    "SPLIT SHEET",
    "===========",
    "",
    `Song: ${input.title}`,
    `Primary artist: ${input.primaryArtist}`,
    `Generated: ${input.generatedAt} (Lyrixis Release Tool v1)`,
    "",
    "Ownership splits:",
    rows,
    "",
    `Total: ${total}%`,
    "",
    "This document records the agreed ownership percentages for the song above.",
    "It is a starting record — have every collaborator sign a full split agreement",
    "before release.",
    "",
  ].join("\n");
}

export function buildMetadataJson(metadata: PackageMetadata, splits: PackageSplit[]): string {
  const missing: string[] = [];
  if (!metadata.isrc) missing.push("isrc");
  if (!metadata.iswc) missing.push("iswc");
  if (!metadata.upc) missing.push("upc");
  return (
    JSON.stringify(
      {
        release: {
          title: metadata.title,
          primary_artist: metadata.primaryArtist,
          featured_artists: metadata.featuredArtists,
          release_type: metadata.releaseType,
          isrc: metadata.isrc,
          isrc_formatted: metadata.isrcFormatted,
          iswc: metadata.iswc,
          iswc_formatted: metadata.iswcFormatted,
          upc: metadata.upc,
          missing_codes: missing,
        },
        splits: splits.map((split) => ({
          name: split.name,
          role: split.role,
          percentage: split.percentage,
          email: split.email ?? null,
        })),
        lyrics_verified_at: metadata.verifiedAt,
        generated_at: metadata.generatedAt,
        generator: "Lyrixis Release Tool v1",
      },
      null,
      2
    ) + "\n"
  );
}

export function buildReadmeText(input: {
  title: string;
  primaryArtist: string;
  missingCodes: string[];
  generatedAt: string;
}): string {
  const missing =
    input.missingCodes.length === 0
      ? "All codes (ISRC, ISWC, UPC) were provided."
      : `Still missing: ${input.missingCodes.join(", ").toUpperCase()}. Get these before release — ` +
        "your distributor or national ISRC agency can issue them.";
  return [
    `${input.title} — release package`,
    `Primary artist: ${input.primaryArtist}`,
    `Generated: ${input.generatedAt} (Lyrixis Release Tool v1)`,
    "",
    "What's inside:",
    "  lyrics.txt   — plain-text lyrics",
    "  lyrics.lrc   — synced lyrics (LRC format)",
    "  lyrics.srt   — synced lyrics (SubRip subtitles)",
    "  metadata.json — title, artists, codes, splits, verification timestamp",
    "  split-sheet.txt — collaborator ownership splits",
    "",
    "Codes:",
    `  ${missing}`,
    "",
    "The lyrics in this package were explicitly verified by the artist in the",
    "Lyrixis Release Tool. Codes are validated for format only — Lyrixis does",
    "not issue official ISRC/ISWC/UPC codes.",
    "",
  ].join("\n");
}
