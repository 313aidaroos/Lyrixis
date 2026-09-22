import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { jsonError, HttpError } from '@/lib/errors';
import { createAdminClient } from '@/lib/supabase/admin';
import { redeem, buyIxisUrl, WalletError } from '@/lib/apixis-wallet';

export const runtime = 'nodejs';

const bodySchema = z.object({ trackId: z.string().min(1) });
const PRODUCT_KEY = 'lyrixis.track.unlock'; // 300 Ixis, metered per-use
const SITE = 'https://lyrixis.vercel.app';

/**
 * Unlock one public catalog recording for the signed-in user.
 * Wallet is the source of truth (entitlement written on capture); track_unlocks is our
 * per-user cache. The old route looked in `tracks` (user uploads, not the public catalog) and
 * flipped a GLOBAL paid flag — Redeem 404'd on every catalog page (verified live).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, 'invalid_body', 'trackId is required.');
    const { trackId } = parsed.data;
    if (!user.email) throw new HttpError(400, 'email_required', 'Sign in with email to redeem.');

    const admin = createAdminClient();
    const { data: rec } = await admin
      .from('catalog_recordings')
      .select('public_id, title')
      .eq('public_id', trackId)
      .maybeSingle();
    if (!rec) throw new HttpError(404, 'track_not_found', 'Track not found');

    const { data: existing } = await admin
      .from('track_unlocks')
      .select('receipt_id')
      .eq('user_id', user.id)
      .eq('recording_public_id', rec.public_id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ success: true, message: 'Already unlocked for your account.', trackId });
    }

    const returnUrl = `${SITE}/catalog/${encodeURIComponent(trackId)}`;
    const result = await redeem({
      ownerEmail: user.email,
      productKey: PRODUCT_KEY,
      // Per attempt: a released hold must never lock the customer out of retrying.
      idempotencyKey: `lyrixis-unlock-${user.id}-${rec.public_id}-${Date.now()}`,
      provision: async (reservation): Promise<{ ixis: number }> => {
        const { error } = await admin.from('track_unlocks').insert({
          user_id: user.id,
          recording_public_id: rec.public_id,
          receipt_id: reservation.reservationId,
        });
        if (error) throw new HttpError(500, 'provision_failed', `Could not record unlock: ${error.message}`);
        return { ixis: reservation.ixis };
      },
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: 'insufficient_ixis',
          message: `Not enough Ixis — this unlock is ${result.needed.toLocaleString()} Ixis. Buy Ixis, then come back.`,
          needed: result.needed,
          buyUrl: buyIxisUrl('lyrixis', returnUrl),
        },
        { status: 402 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Unlocked "${rec.title}" · ${result.result.ixis.toLocaleString()} Ixis`,
      trackId,
      receiptId: result.receiptId,
    });
  } catch (error) {
    if (error instanceof WalletError) {
      return NextResponse.json(
        { error: 'wallet_error', message: `Wallet: ${error.message}` },
        { status: error.status >= 500 ? 502 : error.status }
      );
    }
    return jsonError(error);
  }
}
