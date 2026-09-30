import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/errors";
import { createRelease } from "@/services/releases";

export const runtime = "nodejs";

/** Create a draft release (lyrics verified + metadata + splits, all server-validated). */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const json: unknown = await request.json().catch(() => null);
    const result = await createRelease(user, json);
    return Response.json({ release_id: result.id, track_id: result.trackId }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
