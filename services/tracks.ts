import { createHash, randomUUID } from "crypto";
import { parseBuffer } from "music-metadata";
import { createAdminClient } from "@/lib/supabase/admin";
import { HttpError } from "@/lib/errors";
import { writeAudit } from "@/lib/audit";
import { ALLOWED_EXTENSIONS, detectAudioMagic, validateUpload, validateUploadRequest } from "@/lib/audio";
import { getMaxUploadBytes } from "@/lib/env";
import {
  createSignedUploadTarget,
  originalAudioPath,
  readPrivateObjectHead,
  removePrivateObjects,
  uploadPrivateObject,
} from "@/lib/storage";
import { enqueueTrackProcessing } from "@/lib/queue";
import { assertUploadRateLimit } from "@/lib/rate-limit";
import { extensionFromFilename } from "@/lib/utils";
import type { AppUser, TrackStatus, TrackSummary } from "@/types";
import { confidenceToBand } from "@/lib/utils";

interface TrackRow {
  id: string;
  public_id: string;
  title: string | null;
  artist: string | null;
  status: TrackStatus;
  duration_seconds: number | string | null;
  language: string | null;
  paid: boolean;
  transcription_confidence: number | string | null;
  error_message: string | null;
  created_at: string;
  user_id: string;
  rights_confirmed: boolean;
  rights_confirmed_at: string | null;
  dialect: string | null;
  language_confidence: number | string | null;
  audio_path: string | null;
}

const PREVIEW_MS = 30_000;

export function previewWindowMs(): number {
  return PREVIEW_MS;
}

function toNumber(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toSummary(row: TrackRow): TrackSummary {
  const confidence = toNumber(row.transcription_confidence);
  return {
    id: row.id,
    publicId: row.public_id,
    title: row.title,
    artist: row.artist,
    status: row.status,
    durationSeconds: toNumber(row.duration_seconds),
    language: row.language,
    paid: row.paid,
    transcriptionConfidence: confidence,
    confidenceBand: confidenceToBand(confidence),
    errorMessage: row.error_message,
    createdAt: row.created_at,
  };
}

export async function listTracks(user: AppUser): Promise<TrackSummary[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tracks")
    .select(
      "id, public_id, title, artist, status, duration_seconds, language, paid, transcription_confidence, error_message, created_at, user_id, rights_confirmed, rights_confirmed_at, dialect, language_confidence, audio_path"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new HttpError(500, "list_failed", error.message);
  }

  return ((data as TrackRow[] | null) ?? []).map(toSummary);
}

export async function getOwnedTrack(user: AppUser, publicId: string): Promise<TrackRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tracks")
    .select(
      "id, public_id, title, artist, status, duration_seconds, language, paid, transcription_confidence, error_message, created_at, user_id, rights_confirmed, rights_confirmed_at, dialect, language_confidence, audio_path"
    )
    .eq("public_id", publicId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "track_lookup_failed", error.message);
  }
  if (!data) {
    throw new HttpError(404, "not_found", "Track not found.");
  }
  return data as TrackRow;
}

function assertRightsConfirmed(rightsConfirmed: boolean): void {
  if (!rightsConfirmed) {
    throw new HttpError(
      400,
      "rights_required",
      "rights_confirmed=true is required on every upload. Confirm you have the rights to process this recording."
    );
  }
}

async function checkUploadRateLimit(userId: string): Promise<void> {
  try {
    await assertUploadRateLimit(userId);
  } catch (error) {
    if (error instanceof Error && "status" in error && (error as { status?: number }).status === 429) {
      throw new HttpError(429, "rate_limited", error.message);
    }
    throw new HttpError(
      503,
      "queue_unavailable",
      "REDIS_URL is required for rate limiting and the job queue. Start Redis and the worker."
    );
  }
}

export async function createAndEnqueueTrack(input: {
  user: AppUser;
  filename: string;
  mimeType: string;
  bytes: Buffer;
  title: string | null;
  artist: string | null;
  rightsConfirmed: boolean;
  ip?: string | null;
}): Promise<{ publicId: string; status: TrackStatus }> {
  assertRightsConfirmed(input.rightsConfirmed);
  await checkUploadRateLimit(input.user.id);

  const detected = validateUpload({
    filename: input.filename,
    declaredMime: input.mimeType,
    bytes: input.bytes,
  });

  let title = input.title?.trim() || null;
  let artist = input.artist?.trim() || null;
  let durationSeconds: number | null = null;

  try {
    const tags = await parseBuffer(input.bytes, { mimeType: detected.mime });
    if (!title && tags.common.title) title = tags.common.title;
    if (!artist && tags.common.artist) artist = tags.common.artist;
    if (tags.format.duration) durationSeconds = Number(tags.format.duration.toFixed(3));
  } catch {
    // tag parsing is best-effort; worker re-validates duration
  }

  if (!title) {
    title = input.filename.replace(/\.[^.]+$/, "") || "Untitled";
  }

  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const admin = createAdminClient();
  const rightsConfirmedAt = new Date().toISOString();

  const { data: track, error: insertError } = await admin
    .from("tracks")
    .insert({
      user_id: input.user.id,
      title,
      artist,
      original_filename: input.filename,
      duration_seconds: durationSeconds,
      audio_sha256: sha256,
      status: "uploaded",
      rights_confirmed: true,
      rights_confirmed_at: rightsConfirmedAt,
    })
    .select("id, public_id")
    .single();

  if (insertError || !track) {
    throw new HttpError(500, "create_failed", insertError?.message ?? "Could not create track.");
  }

  const extension = detected.extension || extensionFromFilename(input.filename);
  const audioPath = originalAudioPath(input.user.id, track.id, extension);

  await uploadPrivateObject({
    path: audioPath,
    body: input.bytes,
    contentType: detected.mime,
  });

  return queueStoredTrack({
    userId: input.user.id,
    trackId: track.id,
    publicId: track.public_id,
    audioPath,
    mimeType: detected.mime,
    bytes: input.bytes.length,
    filename: input.filename,
    ip: input.ip ?? null,
    source: "multipart",
  });
}

/**
 * Shared tail of every upload: record the stored original, mark the track queued, enqueue the
 * worker job, seed processing_jobs and write the audit row. The audio is already in Storage.
 */
async function queueStoredTrack(input: {
  userId: string;
  trackId: string;
  publicId: string;
  audioPath: string;
  mimeType: string;
  bytes: number | null;
  filename: string;
  ip: string | null;
  source: "multipart" | "direct";
}): Promise<{ publicId: string; status: TrackStatus }> {
  const admin = createAdminClient();
  const { error: fileError } = await admin.from("track_files").insert({
    track_id: input.trackId,
    kind: "original",
    storage_path: input.audioPath,
    mime_type: input.mimeType,
    bytes: input.bytes,
  });
  if (fileError) {
    throw new HttpError(500, "file_row_failed", fileError.message);
  }

  const { error: updateError } = await admin
    .from("tracks")
    .update({ audio_path: input.audioPath, status: "queued" })
    .eq("id", input.trackId);
  if (updateError) {
    throw new HttpError(500, "update_failed", updateError.message);
  }

  let queueJobId: string;
  try {
    queueJobId = await enqueueTrackProcessing(input.trackId);
  } catch (error) {
    await admin
      .from("tracks")
      .update({
        status: "failed",
        error_message:
          "Job queue is unavailable. Set REDIS_URL and run `npm run worker` as a separate process.",
      })
      .eq("id", input.trackId);
    throw new HttpError(
      503,
      "queue_unavailable",
      error instanceof Error
        ? error.message
        : "REDIS_URL is required. The worker is a separate process, not Vercel serverless."
    );
  }

  const steps = ["validate", "store", "normalize", "transcribe", "language", "align", "costs", "complete"];
  const { error: jobsError } = await admin.from("processing_jobs").insert(
    steps.map((step) => ({
      track_id: input.trackId,
      step,
      state: "pending",
      queue_job_id: queueJobId,
    }))
  );
  if (jobsError) {
    console.error("processing_jobs insert failed", jobsError.message);
  }

  await writeAudit({
    actorUserId: input.userId,
    action: "upload",
    entityType: "track",
    entityId: input.trackId,
    metadata: {
      public_id: input.publicId,
      filename: input.filename,
      bytes: input.bytes,
      source: input.source,
    },
    ip: input.ip,
  });

  return { publicId: input.publicId, status: "queued" };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Bytes read from the stored object to check magic bytes and tags (never the whole file). */
const HEAD_BYTES = 1024 * 1024;

/**
 * Step 1 of the direct upload: checks rights, size, type and the hourly upload limit, then
 * mints a one-time signed upload token for exactly `<user>/<uploadId>/original.<ext>` in the
 * private bucket. No track row yet; nothing is stored until the browser uploads.
 */
export async function prepareDirectUpload(input: {
  user: AppUser;
  filename: string;
  mimeType: string;
  size: number;
  rightsConfirmed: boolean;
}): Promise<{
  uploadId: string;
  bucket: string;
  path: string;
  token: string;
  signedUrl: string;
  maxBytes: number;
}> {
  assertRightsConfirmed(input.rightsConfirmed);
  const { extension } = validateUploadRequest({
    filename: input.filename,
    declaredMime: input.mimeType,
    size: input.size,
  });
  await checkUploadRateLimit(input.user.id);

  const uploadId = randomUUID();
  const path = originalAudioPath(input.user.id, uploadId, extension);
  let target: Awaited<ReturnType<typeof createSignedUploadTarget>>;
  try {
    target = await createSignedUploadTarget(path);
  } catch (error) {
    throw new HttpError(
      502,
      "storage_unavailable",
      error instanceof Error ? error.message : "Could not prepare the upload."
    );
  }
  return { uploadId, ...target, maxBytes: getMaxUploadBytes() };
}

/**
 * Step 2 of the direct upload: the browser has PUT the file into Storage and now sends only
 * metadata. The path must be the one minted for this user in step 1. We read the first 1 MB of
 * the stored object to check magic bytes (and tags), then create the track and queue it.
 */
export async function finalizeDirectUpload(input: {
  user: AppUser;
  uploadId: string;
  path: string;
  filename: string;
  title: string | null;
  artist: string | null;
  rightsConfirmed: boolean;
  ip?: string | null;
}): Promise<{ publicId: string; status: TrackStatus }> {
  assertRightsConfirmed(input.rightsConfirmed);

  if (!UUID_RE.test(input.uploadId)) {
    throw new HttpError(400, "invalid_upload", "upload_id is not valid.");
  }
  const extension = /\.([a-z0-9]+)$/i.exec(input.path)?.[1]?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.has(extension) || input.path !== originalAudioPath(input.user.id, input.uploadId, extension)) {
    // Only a path minted for THIS user can be claimed; never someone else's object.
    throw new HttpError(400, "invalid_upload", "The upload path does not belong to this account.");
  }

  const admin = createAdminClient();
  const { data: existing } = await admin.from("tracks").select("public_id").eq("id", input.uploadId).maybeSingle();
  if (existing) {
    return { publicId: existing.public_id as string, status: "queued" };
  }

  const object = await readPrivateObjectHead(input.path, HEAD_BYTES).catch((error: unknown) => {
    throw new HttpError(502, "storage_unavailable", error instanceof Error ? error.message : "Storage read failed.");
  });
  if (!object || object.head.length === 0) {
    throw new HttpError(404, "upload_not_found", "The uploaded file was not found. Upload it again.");
  }
  if (object.size !== null && object.size > getMaxUploadBytes()) {
    await removePrivateObjects([input.path]).catch(() => undefined);
    throw new HttpError(
      413,
      "file_too_large",
      `File exceeds the ${Math.round(getMaxUploadBytes() / (1024 * 1024))} MB upload cap.`
    );
  }
  const detected = detectAudioMagic(object.head);
  if (!detected) {
    await removePrivateObjects([input.path]).catch(() => undefined);
    throw new HttpError(415, "invalid_audio", "File did not match a known audio signature (magic bytes).");
  }

  const filename = input.filename.trim() || `original.${extension}`;
  let title = input.title?.trim() || null;
  let artist = input.artist?.trim() || null;
  try {
    // Tags (ID3 etc.) sit at the start of the file; duration is measured by the worker.
    const tags = await parseBuffer(object.head, { mimeType: detected.mime });
    if (!title && tags.common.title) title = tags.common.title;
    if (!artist && tags.common.artist) artist = tags.common.artist;
  } catch {
    // best-effort
  }
  if (!title) title = filename.replace(/\.[^.]+$/, "") || "Untitled";

  const { data: track, error: insertError } = await admin
    .from("tracks")
    .insert({
      id: input.uploadId,
      user_id: input.user.id,
      title,
      artist,
      original_filename: filename,
      duration_seconds: null,
      audio_sha256: null,
      audio_path: input.path,
      status: "uploaded",
      rights_confirmed: true,
      rights_confirmed_at: new Date().toISOString(),
    })
    .select("id, public_id")
    .single();
  if (insertError || !track) {
    throw new HttpError(500, "create_failed", insertError?.message ?? "Could not create track.");
  }

  return queueStoredTrack({
    userId: input.user.id,
    trackId: track.id,
    publicId: track.public_id,
    audioPath: input.path,
    mimeType: detected.mime,
    bytes: object.size,
    filename,
    ip: input.ip ?? null,
    source: "direct",
  });
}

export type { TrackRow };
