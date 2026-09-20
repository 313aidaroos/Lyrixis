import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { jsonError, HttpError } from "@/lib/errors";

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
    
    // Stripe checkout disabled — Lyrixis uses Ixis redemption via Apixis Wallet
    // Single track unlock: 300 Ixis
    // TODO: integrate with Apixis Wallet API (POST /api/v1/quotes → /reservations → capture)
    // See @apixiswallet docs/INTEGRATION.md when published
    
    return Response.json({
      error: "wallet_integration_pending",
      message: "Ixis redemption coming soon. Lyrixis uses Apixis Wallet — 100 Ixis = $1. Single track unlock: 300 Ixis.",
      trackId: parsed.data.trackId,
      cost: {
        ixis: 300,
        usd: 3.00,
      },
    }, { status: 503 });
  } catch (error) {
    return jsonError(error);
  }
}
