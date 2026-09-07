import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { HttpError } from "@/lib/errors";
import { getAppUrl } from "@/lib/env";
import { writeAudit } from "@/lib/audit";
import { getStripe, randomIntegrationSuffix } from "@/lib/stripe";
import { quote } from "@/services/pricing";
import { getOwnedTrack } from "@/services/tracks";
import type { AppUser } from "@/types";

export async function createSingleTrackCheckout(input: {
  user: AppUser;
  publicId: string;
}): Promise<{ url: string }> {
  const track = await getOwnedTrack(input.user, input.publicId);
  if (track.paid) {
    throw new HttpError(409, "already_paid", "This track is already unlocked.");
  }
  if (track.status !== "completed" && track.status !== "manual_review") {
    throw new HttpError(409, "not_ready", "Pay after processing finishes and you have previewed the result.");
  }

  const priced = await quote(input.user.id, 1);
  const stripe = getStripe();
  const admin = createAdminClient();

  let customerId = input.user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: input.user.email,
      metadata: { user_id: input.user.id },
    });
    customerId = customer.id;
    await admin.from("users").update({ stripe_customer_id: customerId }).eq("id", input.user.id);
  }

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    customer: customerId,
    client_reference_id: track.id,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: priced.amountCents,
          product_data: {
            name: `Lyrixis single track — ${track.title ?? track.public_id}`,
            description: "Unlock full lyrics, word-level sync, and TXT/SRT/LRC/JSON exports.",
          },
        },
      },
    ],
    metadata: {
      track_id: track.id,
      public_id: track.public_id,
      user_id: input.user.id,
      kind: "single_track",
    },
    success_url: `${getAppUrl()}/tracks/${track.public_id}?checkout=success`,
    cancel_url: `${getAppUrl()}/tracks/${track.public_id}?checkout=cancelled`,
  };

  const session = await stripe.checkout.sessions.create({
    ...params,
    integration_identifier: `lyrixis_single_track_${randomIntegrationSuffix()}`,
  } as Stripe.Checkout.SessionCreateParams & { integration_identifier: string });

  if (!session.url) {
    throw new HttpError(500, "checkout_failed", "Stripe did not return a Checkout URL.");
  }

  await writeAudit({
    actorUserId: input.user.id,
    action: "checkout_created",
    entityType: "track",
    entityId: track.id,
    metadata: { amount_cents: priced.amountCents, session_id: session.id },
  });

  return { url: session.url };
}

export async function fulfillPaidSession(input: {
  trackId: string;
  userId: string;
  paymentIntentId: string | null;
  amountCents: number;
  currency: string;
  sessionId: string;
}): Promise<void> {
  const admin = createAdminClient();

  const { data: track, error } = await admin
    .from("tracks")
    .select("id, paid, user_id")
    .eq("id", input.trackId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!track) {
    throw new Error(`Webhook track not found: ${input.trackId}`);
  }
  if (track.user_id !== input.userId) {
    throw new Error("Webhook user_id does not match track owner.");
  }
  if (track.paid) {
    return;
  }

  const { error: payError } = await admin.from("payments").insert({
    user_id: input.userId,
    stripe_payment_intent_id: input.paymentIntentId ?? input.sessionId,
    amount_cents: input.amountCents,
    currency: input.currency,
    kind: "single_track",
    status: "paid",
    track_id: input.trackId,
  });

  if (payError && payError.code !== "23505") {
    throw new Error(payError.message);
  }

  const { error: trackError } = await admin
    .from("tracks")
    .update({ paid: true })
    .eq("id", input.trackId);
  if (trackError) {
    throw new Error(trackError.message);
  }

  await admin
    .from("track_costs")
    .upsert(
      { track_id: input.trackId, customer_revenue_cents: input.amountCents },
      { onConflict: "track_id" }
    );

  await writeAudit({
    actorUserId: input.userId,
    action: "payment",
    entityType: "track",
    entityId: input.trackId,
    metadata: {
      amount_cents: input.amountCents,
      payment_intent: input.paymentIntentId ?? input.sessionId,
    },
  });
}
