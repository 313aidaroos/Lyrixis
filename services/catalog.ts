import { randomBytes } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { HttpError } from "@/lib/errors";
import { normalizeIsrc, normalizeIswc, normalizeUpc, formatIsrc, formatIswc } from "@/lib/music-ids";

export interface CatalogRecording {
  id: string;
  publicId: string;
  title: string;
  artist: string;
  album: string | null;
  isrc: string | null;
  iswc: string | null;
  upc: string | null;
  year: number | null;
  language: string | null;
  label: string | null;
  writers: string[];
  durationSeconds: number | null;
  source: string;
}

export interface CatalogRecordingDetail extends CatalogRecording {
  lyrics: {
    license: string;
    licenseNote: string | null;
    fullText: string;
  } | null;
}

export interface CatalogIngestInput {
  title: string;
  artist: string;
  album?: string | null;
  isrc?: string | null;
  iswc?: string | null;
  upc?: string | null;
  year?: number | null;
  language?: string | null;
  label?: string | null;
  writers?: string[];
  durationSeconds?: number | null;
  license: "public_domain" | "original";
  licenseNote?: string | null;
  lyrics?: string | null;
}

interface RecordingRow {
  id: string;
  public_id: string;
  title: string;
  artist: string;
  album: string | null;
  isrc: string | null;
  iswc: string | null;
  upc: string | null;
  year: number | null;
  language: string | null;
  label: string | null;
  writers: string[] | null;
  duration_seconds: number | string | null;
  source: string;
}

interface LyricRow {
  license: string;
  license_note: string | null;
  full_text: string;
}

const SELECT_FIELDS =
  "id, public_id, title, artist, album, isrc, iswc, upc, year, language, label, writers, duration_seconds, source";

function createAnonClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new HttpError(
      503,
      "catalog_unconfigured",
      "Catalog is not connected to Supabase yet."
    );
  }
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function mapRecording(row: RecordingRow): CatalogRecording {
  const duration =
    row.duration_seconds === null || row.duration_seconds === undefined
      ? null
      : Number(row.duration_seconds);
  return {
    id: row.id,
    publicId: row.public_id,
    title: row.title,
    artist: row.artist,
    album: row.album,
    isrc: row.isrc,
    iswc: row.iswc,
    upc: row.upc,
    year: row.year,
    language: row.language,
    label: row.label,
    writers: row.writers ?? [],
    durationSeconds: Number.isFinite(duration) ? duration : null,
    source: row.source,
  };
}

export function sanitizeCatalogQuery(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .trim()
    .slice(0, 80)
    .replace(/[%_,()*.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function haystack(row: CatalogRecording): string {
  return [
    row.publicId,
    row.title,
    row.artist,
    row.album,
    row.isrc,
    formatIsrc(row.isrc),
    row.iswc,
    formatIswc(row.iswc),
    row.upc,
    row.language,
    row.label,
    row.source,
    row.year != null ? String(row.year) : null,
    ...row.writers,
  ]
    .filter((value): value is string => Boolean(value && value.length > 0))
    .join(" ")
    .toLowerCase();
}

export function recordingMatchesQuery(row: CatalogRecording, rawQuery: string): boolean {
  const q = sanitizeCatalogQuery(rawQuery);
  if (!q) return true;
  const hay = haystack(row);
  return q
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .every((token) => hay.includes(token));
}

export async function searchCatalog(rawQuery: string | null | undefined): Promise<CatalogRecording[]> {
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from("catalog_recordings")
    .select(SELECT_FIELDS)
    .order("title", { ascending: true })
    .limit(200);

  if (error) {
    throw new HttpError(500, "catalog_search_failed", "Could not search the catalog.");
  }

  const rows = ((data ?? []) as RecordingRow[]).map(mapRecording);
  const q = sanitizeCatalogQuery(rawQuery);
  if (!q) return rows;
  return rows.filter((row) => recordingMatchesQuery(row, q));
}

export async function getCatalogRecording(publicId: string): Promise<CatalogRecordingDetail | null> {
  const supabase = createAnonClient();
  const id = publicId.trim().slice(0, 80);
  if (!id) return null;

  const { data, error } = await supabase
    .from("catalog_recordings")
    .select(`${SELECT_FIELDS}, catalog_lyrics ( license, license_note, full_text )`)
    .eq("public_id", id)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "catalog_lookup_failed", "Could not load that recording.");
  }
  if (!data) return null;

  const row = data as RecordingRow & { catalog_lyrics?: LyricRow | LyricRow[] | null };
  const lyricSource = row.catalog_lyrics;
  const lyric = Array.isArray(lyricSource) ? lyricSource[0] : lyricSource;

  return {
    ...mapRecording(row),
    lyrics: lyric
      ? {
          license: lyric.license,
          licenseNote: lyric.license_note,
          fullText: lyric.full_text,
        }
      : null,
  };
}

function slugPublicId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return `rec_${slug || "untitled"}`;
}

async function uniquePublicId(admin: SupabaseClient, title: string): Promise<string> {
  const base = slugPublicId(title);
  const { data } = await admin.from("catalog_recordings").select("public_id").eq("public_id", base).maybeSingle();
  if (!data) return base;
  return `${base}_${randomBytes(3).toString("hex")}`;
}

function isUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  const message = (error?.message ?? "").toLowerCase();
  return error?.code === "23505" || message.includes("duplicate") || message.includes("unique");
}

export async function ingestCatalogRecording(input: CatalogIngestInput): Promise<CatalogRecordingDetail> {
  if (input.license !== "public_domain" && input.license !== "original") {
    throw new HttpError(400, "license_not_allowed", "Only public-domain or original lyrics can be added here.");
  }

  const lyrics = input.lyrics?.trim() || null;
  const isrc = normalizeIsrc(input.isrc);
  const iswc = normalizeIswc(input.iswc);
  const upc = normalizeUpc(input.upc);

  if (!lyrics && !isrc && !iswc && !upc) {
    throw new HttpError(
      400,
      "insufficient_catalog_data",
      "Add lyrics or at least one of ISRC, ISWC, or UPC."
    );
  }
  if (lyrics && lyrics.length < 8) {
    throw new HttpError(400, "lyrics_too_short", "Lyrics need at least 8 characters.");
  }

  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch {
    throw new HttpError(503, "catalog_unconfigured", "Catalog ingest is not connected to Supabase yet.");
  }

  const publicId = await uniquePublicId(admin, input.title);
  const source = input.license;

  const { data: recording, error: recError } = await admin
    .from("catalog_recordings")
    .insert({
      public_id: publicId,
      title: input.title,
      artist: input.artist,
      album: input.album ?? null,
      isrc,
      iswc,
      upc,
      year: input.year ?? null,
      language: input.language ?? "en",
      label: input.label ?? null,
      writers: input.writers ?? [],
      duration_seconds: input.durationSeconds ?? null,
      source,
    })
    .select(SELECT_FIELDS)
    .single();

  if (recError || !recording) {
    if (isUniqueViolation(recError)) {
      throw new HttpError(409, "id_conflict", "That ISRC, ISWC, or UPC is already in the catalog.");
    }
    throw new HttpError(500, "catalog_ingest_failed", "Could not save that recording.");
  }

  const row = recording as RecordingRow;

  if (lyrics) {
    const { error: lyricError } = await admin.from("catalog_lyrics").insert({
      recording_id: row.id,
      license: input.license,
      license_note: input.licenseNote ?? null,
      full_text: lyrics,
    });

    if (lyricError) {
      await admin.from("catalog_recordings").delete().eq("id", row.id);
      throw new HttpError(500, "catalog_ingest_failed", "Could not save lyrics for that recording.");
    }
  }

  return {
    ...mapRecording(row),
    lyrics: lyrics
      ? {
          license: input.license,
          licenseNote: input.licenseNote ?? null,
          fullText: lyrics,
        }
      : null,
  };
}

export interface CatalogIngestFailure {
  index: number;
  title: string | null;
  message: string;
}

export async function ingestCatalogBatch(
  inputs: CatalogIngestInput[]
): Promise<{ created: CatalogRecordingDetail[]; errors: CatalogIngestFailure[] }> {
  if (inputs.length === 0) {
    throw new HttpError(400, "empty_batch", "Paste at least one recording.");
  }
  if (inputs.length > 25) {
    throw new HttpError(400, "batch_too_large", "Bulk ingest is capped at 25 recordings.");
  }

  const created: CatalogRecordingDetail[] = [];
  const errors: CatalogIngestFailure[] = [];

  for (let index = 0; index < inputs.length; index += 1) {
    const input = inputs[index];
    try {
      created.push(await ingestCatalogRecording(input));
    } catch (error) {
      errors.push({
        index,
        title: input.title || null,
        message: error instanceof HttpError ? error.message : "Could not save that recording.",
      });
    }
  }

  return { created, errors };
}
