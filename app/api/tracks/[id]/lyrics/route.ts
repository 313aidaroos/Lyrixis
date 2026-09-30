import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/errors";
import { getOwnedTrack } from "@/services/tracks";
import { loadCurrentLyrics } from "@/services/corrections";

export const runtime = "nodejs";

/**
 * Owner-only full lyric lines for a track — used by the Release Tool wizard's
 * review step. The public track-detail route keeps its 30s preview for unpaid
 * tracks; this route exists so the artist can review (and verify) their own
 * complete transcription before paying for the release package.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const track = await getOwnedTrack(user, id);
    const lyrics = await loadCurrentLyrics(track.id);
    return Response.json({
      status: track.status,
      error_message: track.error_message,
      title: track.title,
      artist: track.artist,
      lines: (lyrics?.lines ?? []).map((line) => ({
        lineIndex: line.lineIndex,
        text: line.text,
        startMs: line.startMs,
        endMs: line.endMs,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}
