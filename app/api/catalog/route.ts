import { z } from "zod";
import { jsonError, HttpError } from "@/lib/errors";
import { assertCatalogIngestRateLimit } from "@/lib/rate-limit";
import { ingestCatalogRecording, searchCatalog } from "@/services/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

const bodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  artist: z.string().trim().min(1).max(200),
  album: optionalText(200),
  isrc: optionalText(20),
  iswc: optionalText(20),
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
  lyrics: z.string().trim().min(8).max(20_000),
});

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    const results = await searchCatalog(q);
    return Response.json({ query: q, count: results.length, results });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await assertCatalogIngestRateLimit(clientIp(request));

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      throw new HttpError(400, "invalid_json", "Request body must be JSON.");
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new HttpError(
        400,
        "invalid_body",
        "Need a title, artist, license (public_domain or original), and lyrics."
      );
    }

    const recording = await ingestCatalogRecording({
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
    });

    return Response.json({ ok: true, recording }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
