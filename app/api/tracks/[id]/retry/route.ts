import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/errors";
import { retryTrack } from "@/services/tracks";

export const runtime = "nodejs";
// 300 = Vercel Hobby + Fluid compute max (PROCESSING_MAX_DURATION_SECONDS in lib/processing.ts).
// The pipeline runs in this invocation via after().
export const maxDuration = 300;

/** POST /api/tracks/:id/retry — re-run processing for the caller's failed or stuck track. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const forwarded = request.headers.get("x-forwarded-for");
    const result = await retryTrack({ user, publicId: id, ip: forwarded?.split(",")[0]?.trim() ?? null });
    return Response.json({ track_id: result.publicId, status: result.status }, { status: 202 });
  } catch (error) {
    return jsonError(error);
  }
}
