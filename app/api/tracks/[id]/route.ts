import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/errors";
import { loadCurrentLyrics } from "@/services/corrections";
import { getOwnedTrack, previewWindowMs, toSummary } from "@/services/tracks";
import type { TrackDetail } from "@/types";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const track = await getOwnedTrack(user, id);
    const lyrics = await loadCurrentLyrics(track.id);
    const paid = track.paid;
    const preview = !paid;
    const cutoff = previewWindowMs();
    const lines = (lyrics?.lines ?? []).filter((line) => !preview || line.startMs < cutoff);

    const detail: TrackDetail = {
      ...toSummary(track),
      dialect: track.dialect,
      languageConfidence: track.language_confidence === null
        ? null
        : Number(track.language_confidence),
      rightsConfirmed: track.rights_confirmed,
      rightsConfirmedAt: track.rights_confirmed_at,
      preview,
      watermarked: preview,
      lines,
      fullText: preview
        ? lines.map((line) => line.text).join("\n")
        : lyrics?.fullText ?? null,
      transcriptionVersion: lyrics?.version ?? null,
    };

    return Response.json({ track: detail });
  } catch (error) {
    return jsonError(error);
  }
}
