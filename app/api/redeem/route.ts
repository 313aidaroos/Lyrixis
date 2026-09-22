import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { jsonError, HttpError } from '@/lib/errors';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const bodySchema = z.object({
  trackId: z.string().min(1),
});

const WALLET_BASE_URL = 'https://apixis-wallet.vercel.app';

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const json: unknown = await request.json();
    const parsed = bodySchema.safeParse(json);
    
    if (!parsed.success) {
      throw new HttpError(400, 'invalid_body', 'trackId is required.');
    }

    const { trackId } = parsed.data;

    // Check if track exists and user has access
    const admin = createAdminClient();
    const { data: track, error: trackError } = await admin
      .from('tracks')
      .select('id, public_id, title, paid, user_id')
      .eq('public_id', trackId)
      .single();

    if (trackError || !track) {
      throw new HttpError(404, 'track_not_found', 'Track not found');
    }

    // Check if already paid
    if (track.paid) {
      return NextResponse.json({
        success: true,
        message: 'Track already unlocked',
        trackId,
      });
    }

    // Single track unlock: 300 Ixis
    const productKey = 'lyrixis.track.unlock';
    const idempotencyKey = `lyrixis-track-${track.id}-${user.id}`;

    // 1. Quote
    const quoteRes = await fetch(`${WALLET_BASE_URL}/api/v1/quotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productKey }),
    });

    if (!quoteRes.ok) {
      if (quoteRes.status === 404) {
        throw new HttpError(503, 'sku_not_found', 'Lyrixis SKU not in Wallet catalog yet. Contact @apixiswallet.');
      }
      throw new HttpError(503, 'wallet_quote_failed', 'Failed to quote price');
    }

    const quote = await quoteRes.json();

    // 2. Reserve Ixis
    if (!process.env.WALLET_API_KEY) {
      throw new HttpError(503, 'wallet_not_configured', 'Wallet integration not configured');
    }

    const reserveRes = await fetch(`${WALLET_BASE_URL}/api/v1/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WALLET_API_KEY}`,
      },
      body: JSON.stringify({
        productKey,
        quoteId: quote.quoteId,
        idempotencyKey,
        ownerId: user.id,
      }),
    });

    if (!reserveRes.ok) {
      const error = await reserveRes.json().catch(() => ({}));
      
      if (reserveRes.status === 402) {
        // Not enough Ixis
        return NextResponse.json({
          error: 'insufficient_ixis',
          message: 'Not enough Ixis. Buy Ixis in Apixis Wallet first.',
          required: quote.xp,
          buyUrl: `${WALLET_BASE_URL}/buy?return_url=${encodeURIComponent('https://lyrixis.vercel.app/catalog/' + trackId)}&product=lyrixis`,
        }, { status: 402 });
      }

      throw new HttpError(503, 'wallet_reserve_failed', error.message || 'Failed to reserve Ixis');
    }

    const reservation = await reserveRes.json();

    // 3. Provision (unlock the track)
    try {
      const { error: unlockError } = await admin
        .from('tracks')
        .update({ paid: true })
        .eq('id', track.id);

      if (unlockError) {
        // Provision failed - release the reservation
        await fetch(`${WALLET_BASE_URL}/api/v1/reservations/${reservation.reservationId}/release`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.WALLET_API_KEY}`,
          },
        });

        throw new HttpError(500, 'provision_failed', 'Failed to unlock track');
      }

      // 4. Capture (finalize the spend)
      const captureRes = await fetch(`${WALLET_BASE_URL}/api/v1/reservations/${reservation.reservationId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WALLET_API_KEY}`,
        },
      });

      if (!captureRes.ok) {
        console.error('Wallet capture failed but track already unlocked:', await captureRes.text());
        // Track is unlocked but Ixis might not be spent - log for manual resolution
      }

      return NextResponse.json({
        success: true,
        message: `Track unlocked! Spent ${quote.xp} Ixis ($${quote.usdEquivalent})`,
        trackId,
        spent: {
          ixis: quote.xp,
          usd: quote.usdEquivalent,
        },
      });

    } catch (provisionError) {
      // Release reservation if provision fails
      await fetch(`${WALLET_BASE_URL}/api/v1/reservations/${reservation.reservationId}/release`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WALLET_API_KEY}`,
        },
      }).catch(() => {});

      throw provisionError;
    }

  } catch (error) {
    return jsonError(error);
  }
}
