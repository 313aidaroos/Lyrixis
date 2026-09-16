import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "@/lib/errors";

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

export async function searchCatalog(rawQuery: string | null | undefined): Promise<CatalogRecording[]> {
  const supabase = createAnonClient();
  const q = sanitizeCatalogQuery(rawQuery);

  let request = supabase
    .from("catalog_recordings")
    .select(SELECT_FIELDS)
    .order("title", { ascending: true })
    .limit(50);

  if (q) {
    const like = `"%${q}%"`;
    request = request.or(
      [
        `title.ilike.${like}`,
        `artist.ilike.${like}`,
        `album.ilike.${like}`,
        `isrc.ilike.${like}`,
        `iswc.ilike.${like}`,
        `upc.ilike.${like}`,
      ].join(",")
    );
  }

  const { data, error } = await request;
  if (error) {
    throw new HttpError(500, "catalog_search_failed", "Could not search the catalog.");
  }
  return ((data ?? []) as RecordingRow[]).map(mapRecording);
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
