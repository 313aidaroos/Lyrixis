import { requireUser } from "@/lib/auth";
import { jsonError, HttpError } from "@/lib/errors";
import { quote } from "@/services/pricing";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const songs = Number.parseInt(new URL(request.url).searchParams.get("songs") ?? "1", 10);
    if (!Number.isInteger(songs) || songs < 1) {
      throw new HttpError(400, "invalid_song_count", "songs must be a positive integer.");
    }
    const result = await quote(user.id, songs);
    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
