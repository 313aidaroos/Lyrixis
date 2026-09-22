import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { jsonError, HttpError } from '@/lib/errors';
import { createAdminClient } from '@/lib/supabase/admin';
import { redeem, buyIxisUrl, WalletError } from '@/lib/apixis-wallet';

export const runtime = 'nodejs';

const bodySchema = z.object({
  trackId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const json: unknown = await request.json();
    const parsed = bodySchema.safeParse(json);
    
    if (!parsed.success) {
      throw new HttpError(400, 'invalid_body', 'trackId is required.');
    }

    const { trackId } = parsed.data;

    // Check if track exists
    const admin = createAdminClient();
    const { data: track, error: trackError } = await admin
      .from('tracks')
      .select('id, public_id, title, paid, user_id')
      .eq('public_id', trackId)
      .single();

    if (trackError || !track) {
      throw new HttpError(404, 'track_not_found', 'Track not found');
    }

    // Check if already unlocked
    if (track.paid) {
      return NextResponse.json({
        success: true,
        message: 'Track already unlocked',
        trackId,
      });
    }

    // Unlock single track: 300 Ixis
    const productKey = 'lyrixis.track.unlock';
    // Per attempt: a released hold must never lock the customer out of retrying.
    const idempotencyKey = `lyrixis-track-${track.id}-${user.id}-${Date.now()}`;
    const returnUrl = `https://lyrixis.vercel.app/catalog/${trackId}`;

    if (!user.email) {
      return NextResponse.json({ error: 'email_required', message: 'Sign in with email to redeem.' }, { status: 400 });
    }
    const result = await redeem({
      // Family identity is the verified EMAIL; this project's uid means nothing to the Wallet.
      ownerEmail: user.email,
      productKey,
      idempotencyKey,
      provision: async (reservation): Promise<{ trackId: string; title: string; ixis: number }> => {
        // Unlock the track while Ixis are held
        const { error: unlockError } = await admin
          .from('tracks')
          .update({ paid: true })
          .eq('id', track.id);

        if (unlockError) {
          throw new HttpError(500, 'provision_failed', 'Failed to unlock track');
        }

        return { trackId: track.public_id, title: track.title, ixis: reservation.ixis };
      },
    });

    if (!result.ok) {
      // 402 insufficient Ixis
      return NextResponse.json({
        error: 'insufficient_ixis',
        message: result.message,
        needed: result.needed,
        buyUrl: buyIxisUrl('lyrixis', returnUrl),
      }, { status: 402 });
    }

    // Success: track unlocked and Ixis captured
    return NextResponse.json({
      success: true,
      message: `Track unlocked! Spent ${result.result.ixis} Ixis ($${(result.result.ixis / 100).toFixed(2)})`,
      trackId: result.result.trackId,
      receiptId: result.receiptId,
      spent: {
        ixis: result.result.ixis,
        usd: (result.result.ixis / 100).toFixed(2),
      },
    });

  } catch (error) {
    if (error instanceof WalletError && error.insufficient) {
      const returnUrl = `https://lyrixis.vercel.app/catalog`;
      return NextResponse.json({
        error: 'insufficient_ixis',
        message: error.message,
        buyUrl: buyIxisUrl('lyrixis', returnUrl),
      }, { status: 402 });
    }
    return jsonError(error);
  }
}
