import { createHash } from "crypto";
import { parseBuffer } from "music-metadata";
import { createAdminClient } from "@/lib/supabase/admin";
import { HttpError } from "@/lib/errors";
import { writeAudit } from "@/lib/audit";
import { validateUpload } from "@/lib/audio";
import { originalAudioPath, uploadPrivateObject } from "@/lib/storage";
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
  if (!input.rightsConfirmed) {
    throw new HttpError(
      400,
      "rights_required",
      "rights_confirmed=true is required on every upload. Confirm you have the rights to process this recording."
    );
  }

  try {
    await assertUploadRateLimit(input.user.id);
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

  const { error: fileError } = await admin.from("track_files").insert({
    track_id: track.id,
    kind: "original",
    storage_path: audioPath,
    mime_type: detected.mime,
    bytes: input.bytes.length,
  });
  if (fileError) {
    throw new HttpError(500, "file_row_failed", fileError.message);
  }

  const { error: updateError } = await admin
    .from("tracks")
    .update({ audio_path: audioPath, status: "queued" })
    .eq("id", track.id);
  if (updateError) {
    throw new HttpError(500, "update_failed", updateError.message);
  }

  let queueJobId: string;
  try {
    queueJobId = await enqueueTrackProcessing(track.id);
  } catch (error) {
    await admin
      .from("tracks")
      .update({
        status: "failed",
        error_message:
          "Job queue is unavailable. Set REDIS_URL and run `npm run worker` as a separate process.",
      })
      .eq("id", track.id);
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
      track_id: track.id,
      step,
      state: "pending",
      queue_job_id: queueJobId,
    }))
  );
  if (jobsError) {
    console.error("processing_jobs insert failed", jobsError.message);
  }

  await writeAudit({
    actorUserId: input.user.id,
    action: "upload",
    entityType: "track",
    entityId: track.id,
    metadata: { public_id: track.public_id, filename: input.filename, bytes: input.bytes.length },
    ip: input.ip ?? null,
  });

  return { publicId: track.public_id, status: "queued" };
}

export type { TrackRow };
