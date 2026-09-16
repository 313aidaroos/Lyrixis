import { z } from "zod";
import { HttpError } from "@/lib/errors";
import type { CatalogIngestInput } from "@/services/catalog";

const optionalText = (max: number) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (typeof value !== "string") return null;
      const trimmed = value.trim();
      if (!trimmed) return null;
      return trimmed.slice(0, max);
    });

const optionalYear = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined || value === "") return null;
    const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
    if (!Number.isFinite(n) || n < 1000 || n > 2100) return null;
    return n;
  });

export const catalogIngestSchema = z.object({
  title: z.string().trim().min(1).max(200),
  artist: z.string().trim().min(1).max(200),
  album: optionalText(200),
  isrc: optionalText(32),
  iswc: optionalText(32),
  upc: optionalText(20),
  year: optionalYear,
  language: optionalText(16),
  label: optionalText(200),
  writers: z
    .union([z.string(), z.array(z.string()), z.null(), z.undefined()])
    .transform((value) => {
      const parts = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
      return parts.map((part) => part.trim()).filter(Boolean).slice(0, 20);
    }),
  license: z.enum(["public_domain", "original"]),
  license_note: optionalText(400),
  lyrics: optionalText(20_000),
});

export function toIngestInput(raw: unknown): CatalogIngestInput {
  const parsed = catalogIngestSchema.safeParse(raw);
  if (!parsed.success) {
    throw new HttpError(
      400,
      "invalid_body",
      "Need a title, artist, and license (public_domain or original)."
    );
  }
  return {
    title: parsed.data.title,
    artist: parsed.data.artist,
    album: parsed.data.album,
    isrc: parsed.data.isrc,
    iswc: parsed.data.iswc,
    upc: parsed.data.upc,
    year: parsed.data.year,
    language: parsed.data.language,
    label: parsed.data.label,
    writers: parsed.data.writers,
    license: parsed.data.license,
    licenseNote: parsed.data.license_note,
    lyrics: parsed.data.lyrics,
  };
}
