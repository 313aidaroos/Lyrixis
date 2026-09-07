import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { jsonError, HttpError } from "@/lib/errors";
import { createSingleTrackCheckout } from "@/services/billing";

export const runtime = "nodejs";

const bodySchema = z.object({
  trackId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const json: unknown = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new HttpError(400, "invalid_body", "trackId is required.");
    }
    const result = await createSingleTrackCheckout({ user, publicId: parsed.data.trackId });
    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
