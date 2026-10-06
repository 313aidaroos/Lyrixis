// 2026-10-05 (Grok): Option B — run the lyrics pipeline inside a Vercel function, no Redis, no
// separate worker. The upload-finalize request (POST /api/tracks) and the retry route schedule
// `processTrack` with Next's `after()`, so the response returns immediately and the pipeline keeps
// running in the same function invocation until it finishes or hits maxDuration.
//
// Option A (BullMQ + `npm run worker` on Railway etc.) still works: set PROCESSING_MODE=queue and
// REDIS_URL, and run the worker. `workers/index.ts` and `lib/queue.ts` are untouched.
// next/server is imported lazily inside startTrackProcessing so this module (pulled in through
// services/tracks) stays importable by the standalone worker bundle (Option A).

/**
 * Vercel Hobby with Fluid compute allows functions up to 300 s (Pro: 800 s). The project is on
 * Hobby (checked 2026-10-05), so every route that runs the pipeline exports maxDuration = 300.
 * Route files must export the literal number; keep them in sync with this constant.
 */
export const PROCESSING_MAX_DURATION_SECONDS = 300;

/** No status change for this long while "active" means the function was killed mid-run. */
export const STUCK_AFTER_MS = (PROCESSING_MAX_DURATION_SECONDS + 90) * 1000;

export const ACTIVE_STATUSES = new Set(["queued", "processing", "transcribing", "aligning", "analyzing"]);

export const STUCK_MESSAGE = "Processing stopped before it finished (time limit). Press Retry to run it again.";

export type ProcessingMode = "inline" | "queue";

export function processingMode(): ProcessingMode {
  return process.env.PROCESSING_MODE?.trim().toLowerCase() === "queue" ? "queue" : "inline";
}

export function isStuck(track: { status: string; updated_at?: string | null }, now = Date.now()): boolean {
  if (!ACTIVE_STATUSES.has(track.status) || !track.updated_at) return false;
  const updated = Date.parse(track.updated_at);
  return Number.isFinite(updated) && now - updated > STUCK_AFTER_MS;
}

/** Statuses from which the owner may press Retry. */
export function canRetry(track: { status: string; updated_at?: string | null; audio_path?: string | null }, now = Date.now()): boolean {
  if (!track.audio_path) return false;
  if (track.status === "failed") return true;
  if (track.status === "uploaded") {
    // Finalize normally moves a row out of "uploaded" within a second; only offer Retry if it never did.
    const updated = track.updated_at ? Date.parse(track.updated_at) : Number.NaN;
    return Number.isFinite(updated) && now - updated > 120_000;
  }
  return isStuck(track, now);
}

/**
 * Start processing for a track whose audio is already in Storage. Returns the job id recorded in
 * processing_jobs.queue_job_id ("inline" for Option B). Must be called inside a request.
 */
export async function startTrackProcessing(trackId: string): Promise<string> {
  if (processingMode() === "queue") {
    const { enqueueTrackProcessing } = await import("@/lib/queue");
    return enqueueTrackProcessing(trackId);
  }
  const { after } = await import("next/server");
  after(async () => {
    try {
      const { processTrack } = await import("@/workers/pipeline");
      await processTrack(trackId);
      console.log(`[lyrixis] processed ${trackId}`);
    } catch (error) {
      // processTrack already set tracks.status = failed with the message.
      console.error(`[lyrixis] processing failed for ${trackId}:`, error instanceof Error ? error.message : error);
    }
  });
  return "inline";
}
