import Stripe from "stripe";
import { jsonError, HttpError } from "@/lib/errors";
import { getStripe } from "@/lib/stripe";
import { getStripeWebhookSecret } from "@/lib/env";
import { fulfillPaidSession } from "@/services/billing";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      throw new HttpError(400, "missing_signature", "Stripe-Signature header is required.");
    }

    const rawBody = await request.text();
    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(rawBody, signature, getStripeWebhookSecret());
    } catch (error) {
      throw new HttpError(
        400,
        "invalid_signature",
        error instanceof Error ? error.message : "Stripe signature verification failed."
      );
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "paid") {
        return Response.json({ received: true, ignored: "not_paid" });
      }
      const trackId = session.metadata?.track_id;
      const userId = session.metadata?.user_id;
      if (!trackId || !userId) {
        throw new HttpError(400, "missing_metadata", "Checkout session is missing track_id or user_id metadata.");
      }
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;
      await fulfillPaidSession({
        trackId,
        userId,
        paymentIntentId,
        amountCents: session.amount_total ?? 0,
        currency: session.currency ?? "usd",
        sessionId: session.id,
      });
    }

    return Response.json({ received: true });
  } catch (error) {
    return jsonError(error);
  }
}
