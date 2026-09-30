import { describe, expect, it } from "vitest";
import {
  createReleaseSchema,
  releaseMetadataSchema,
  splitsSchema,
} from "@/lib/release-schema";
import {
  buildMetadataJson,
  buildReadmeText,
  buildSplitSheetText,
  crc32,
  createZip,
  type ZipEntry,
} from "@/lib/release-package";

const textDecoder = new TextDecoder();

function readU16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function readU32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

/** Minimal parser for the store-only zips createZip produces. */
function parseZip(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries: ZipEntry[] = [];
  let offset = 0;
  while (offset < bytes.length) {
    const signature = readU32(view, offset);
    if (signature !== 0x04034b50) break; // central directory / end of central directory
    const method = readU16(view, offset + 8);
    expect(method).toBe(0); // store only
    const crc = readU32(view, offset + 14);
    const size = readU32(view, offset + 18);
    const nameLength = readU16(view, offset + 26);
    const extraLength = readU16(view, offset + 28);
    const nameStart = offset + 30;
    const name = textDecoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
    const dataStart = nameStart + nameLength + extraLength;
    const data = bytes.subarray(dataStart, dataStart + size);
    expect(crc32(data)).toBe(crc);
    entries.push({ name, data: Uint8Array.from(data) });
    offset = dataStart + size;
  }
  return entries;
}

describe("splitsSchema", () => {
  it("accepts percentages that sum to exactly 100", () => {
    const result = splitsSchema.safeParse([
      { name: "A", role: "Writer", percentage: 50, email: "" },
      { name: "B", role: "Producer", percentage: 50, email: "b@example.com" },
    ]);
    expect(result.success).toBe(true);
  });

  it("accepts decimal percentages that sum to 100", () => {
    const result = splitsSchema.safeParse([
      { name: "A", role: "Writer", percentage: 33.33 },
      { name: "B", role: "Producer", percentage: 33.33 },
      { name: "C", role: "Vocalist", percentage: 33.34 },
    ]);
    expect(result.success).toBe(true);
  });

  it("rejects percentages that do not sum to 100", () => {
    const result = splitsSchema.safeParse([
      { name: "A", role: "Writer", percentage: 60 },
      { name: "B", role: "Producer", percentage: 30 },
    ]);
    expect(result.success).toBe(false);
  });

  it("rejects an empty collaborator list and invalid entries", () => {
    expect(splitsSchema.safeParse([]).success).toBe(false);
    expect(
      splitsSchema.safeParse([{ name: "", role: "Writer", percentage: 100 }]).success
    ).toBe(false);
    expect(
      splitsSchema.safeParse([{ name: "A", role: "Writer", percentage: 101 }]).success
    ).toBe(false);
  });
});

describe("releaseMetadataSchema", () => {
  it("requires title and primary artist, allows missing codes", () => {
    const ok = releaseMetadataSchema.safeParse({
      title: "Song",
      primaryArtist: "Artist",
    });
    expect(ok.success).toBe(true);
    expect(releaseMetadataSchema.safeParse({ title: "", primaryArtist: "A" }).success).toBe(
      false
    );
  });
});

describe("createReleaseSchema", () => {
  it("validates the full create payload", () => {
    const result = createReleaseSchema.safeParse({
      trackPublicId: "trx_abc",
      metadata: { title: "Song", primaryArtist: "Artist" },
      splits: [{ name: "A", role: "Writer", percentage: 100 }],
    });
    expect(result.success).toBe(true);
  });
});

describe("createZip", () => {
  it("round-trips entries with intact names, data, and CRCs", () => {
    const entries: ZipEntry[] = [
      { name: "lyrics.txt", data: new TextEncoder().encode("hello\nworld\n") },
      { name: "nested/metadata.json", data: new TextEncoder().encode('{"a":1}') },
      { name: "empty.txt", data: new Uint8Array(0) },
    ];
    const parsed = parseZip(createZip(entries));
    expect(parsed.map((entry) => entry.name)).toEqual([
      "lyrics.txt",
      "nested/metadata.json",
      "empty.txt",
    ]);
    expect(textDecoder.decode(parsed[0].data)).toBe("hello\nworld\n");
    expect(textDecoder.decode(parsed[1].data)).toBe('{"a":1}');
    expect(parsed[2].data.length).toBe(0);
  });

  it("handles unicode filenames and binary-ish content", () => {
    const data = new Uint8Array([0, 255, 13, 10, 239, 187, 191]);
    const parsed = parseZip(createZip([{ name: "café-lrc.lrc", data }]));
    expect(parsed[0].name).toBe("café-lrc.lrc");
    expect(Array.from(parsed[0].data)).toEqual(Array.from(data));
  });
});

describe("package file builders", () => {
  const splits = [
    { name: "Ava", role: "Writer", percentage: 70, email: "ava@example.com" },
    { name: "Ben", role: "Producer", percentage: 30, email: null },
  ];

  it("buildSplitSheetText lists collaborators and totals 100%", () => {
    const text = buildSplitSheetText({
      title: "Hit Song",
      primaryArtist: "Ava",
      splits,
      generatedAt: "2026-09-29T00:00:00Z",
    });
    expect(text).toContain("Ava <ava@example.com> — Writer: 70%");
    expect(text).toContain("Ben — Producer: 30%");
    expect(text).toContain("Total: 100%");
  });

  it("buildMetadataJson flags missing codes", () => {
    const json = buildMetadataJson(
      {
        title: "Hit Song",
        primaryArtist: "Ava",
        featuredArtists: [],
        releaseType: "single",
        isrc: "USABC2600001",
        isrcFormatted: "US-ABC-26-00001",
        iswc: null,
        iswcFormatted: null,
        upc: null,
        verifiedAt: "2026-09-29T00:00:00Z",
        generatedAt: "2026-09-29T00:00:00Z",
      },
      splits
    );
    const parsed = JSON.parse(json);
    expect(parsed.release.isrc).toBe("USABC2600001");
    expect(parsed.release.missing_codes).toEqual(["iswc", "upc"]);
    expect(parsed.splits).toHaveLength(2);
  });

  it("buildReadmeText calls out missing codes", () => {
    const text = buildReadmeText({
      title: "Hit Song",
      primaryArtist: "Ava",
      missingCodes: ["isrc"],
      generatedAt: "2026-09-29T00:00:00Z",
    });
    expect(text).toContain("Still missing: ISRC");
    expect(text).toContain("lyrics.lrc");
  });
});
