import { requireUser } from "@/lib/auth";
import { jsonError, HttpError } from "@/lib/errors";
import {
  RELEASE_PRODUCT_KEY,
  getRelease,
  markReleasePaid,
  revertReleaseToDraft,
} from "@/services/releases";
import { quote } from "@/services/pricing";
import { buyIxisUrl, redeem, WalletError } from "@/lib/apixis-wallet";
import { apixisOwner } from "@/lib/apixis-login";

export const runtime = "nodejs";
export const maxDuration = 60;

const SITE = "https://lyrixis.vercel.app";

/**
 * Pay for a draft release in Ixis via the Apixis Wallet.
 *
 * Pricing: the USD quote comes server-side from services/pricing.ts
 * (quote(userId, songCount)) — the frontend never computes the charged price.
 * The actual charge goes through the Wallet redeem flow with product key
 * `lyrixis.release.package`; the Wallet is the source of truth for Ixis.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const release = await getRelease(user, id);

    if (release.status === "paid" || release.status === "delivered") {
      return Response.json({ success: true, already: true, release_id: release.id });
    }
    if (release.status !== "draft") {
      throw new HttpError(409, "invalid_status", "This release cannot be paid for.");
    }
    if (!user.email) {
      throw new HttpError(400, "email_required", "Sign in with email to pay.");
    }

    // Server-side USD quote (accounting). Never trust a client-supplied price.
    const usdQuote = await quote(user.id, release.song_count);

    const returnUrl = `${SITE}/release?track=`;
    const attemptId = request.headers.get("x-idempotency-key") || crypto.randomUUID();

    const result = await redeem({
      owner: (await apixisOwner(user.email)) ?? user.email,
      productKey: RELEASE_PRODUCT_KEY,
      // Stable per user+release+attempt (NOT Date.now(); retry must reuse key)
      idempotencyKey: `lyx-rel-${user.id.slice(0, 12)}-${release.id.slice(0, 8)}-${attemptId.slice(0, 8)}`,
      provision: async (reservation) => {
        await markReleasePaid({
          user,
          releaseId: release.id,
          amountCents: usdQuote.amountCents,
          reservationId: reservation.reservationId,
        });
        return { ixis: reservation.ixis };
      },
      unprovision: async () => {
        // Capture failed after we marked the release paid: revert to draft.
        await revertReleaseToDraft({ user, releaseId: release.id });
      },
    });

    if (!result.ok) {
      return Response.json(
        {
          error: "insufficient_ixis",
          message: `Not enough Ixis — this release is ${result.needed.toLocaleString()} Ixis. Buy Ixis, then come back.`,
          needed: result.needed,
          buyUrl: buyIxisUrl("lyrixis", returnUrl),
        },
        { status: 402 }
      );
    }

    return Response.json({
      success: true,
      release_id: release.id,
      receiptId: result.receiptId,
      ixis: result.result.ixis,
      amount_cents: usdQuote.amountCents,
    });
  } catch (error) {
    if (error instanceof WalletError) {
      const unknownProduct =
        error.status === 400 || error.message.toLowerCase().includes("unknown product");
      return Response.json(
        {
          error: unknownProduct ? "product_not_registered" : "wallet_error",
          message: unknownProduct
            ? `Wallet: product ${RELEASE_PRODUCT_KEY} is not registered in the Apixis Wallet catalog yet.`
            : `Wallet: ${error.message}`,
        },
        { status: unknownProduct ? 502 : error.status >= 500 ? 502 : error.status }
      );
    }
    return jsonError(error);
  }
}
