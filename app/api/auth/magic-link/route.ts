import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

const MAGIC_LINK_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 3; // max 3 requests per minute

const requestCounts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    // Rate limiting by IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const limiter = requestCounts.get(ip);

    if (limiter && limiter.resetAt > now) {
      if (limiter.count >= RATE_LIMIT_MAX) {
        return NextResponse.json(
          { error: 'Too many requests. Try again in 1 minute.' },
          { status: 429 }
        );
      }
      limiter.count++;
    } else {
      requestCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    }

    // Generate magic link token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(now + MAGIC_LINK_EXPIRY).toISOString();

    // Store token in database
    const admin = createAdminClient();
    const { error } = await admin.from('magic_links').insert({
      email,
      token,
      expires_at: expiresAt,
      used: false,
    });

    if (error) {
      console.error('Magic link creation failed:', error);
      return NextResponse.json(
        { error: 'Failed to create magic link' },
        { status: 500 }
      );
    }

    // Send email (mock for now, integrate with email service)
    const magicUrl = `${process.env.APP_URL}/auth/verify?token=${token}`;
    console.log(`Magic link for ${email}: ${magicUrl}`);

    return NextResponse.json({
      success: true,
      message: 'Check your email for the magic link',
      token, // Remove in production
    });
  } catch (error) {
    console.error('Magic link error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
