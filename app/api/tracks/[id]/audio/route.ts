import { requireUser } from "@/lib/auth";
import { jsonError, HttpError } from "@/lib/errors";
import { signedDownloadUrl } from "@/lib/storage";
import { getOwnedTrack } from "@/services/tracks";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const track = await getOwnedTrack(user, id);
    if (!track.audio_path) {
      throw new HttpError(404, "no_audio", "Audio is not stored yet.");
    }
    const url = await signedDownloadUrl(track.audio_path);
    return Response.json({ url, expiresInSeconds: 90 });
  } catch (error) {
    return jsonError(error);
  }
}
