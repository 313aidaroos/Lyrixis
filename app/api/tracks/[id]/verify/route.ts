import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/errors";
import { recordHumanVerification } from "@/services/releases";

export const runtime = "nodejs";

/**
 * The artist's explicit "Lyrics verified" confirmation — the Release Tool's
 * trust anchor. Writes a human_verified verification record on the track.
 * Ownership is enforced inside recordHumanVerification.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const result = await recordHumanVerification({ user, publicId: id });
    return Response.json({ verified: true, already: result.already });
  } catch (error) {
    return jsonError(error);
  }
}
