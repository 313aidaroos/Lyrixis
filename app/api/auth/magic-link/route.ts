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

    // Email delivery pending RESEND_API_KEY. Never return or log the token:
    // leaking it lets anyone log in as any email (including the owner).
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Login email is not configured yet. Please try again later.' },
        { status: 503 }
      );
    }
    const magicUrl = `${process.env.APP_URL}/auth/verify?token=${token}`;
    const { Resend } = await import('resend');
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.EMAIL_FROM || 'Lyrixis <lyrixis@apixis.dev>',
      to: email,
      subject: 'Your Lyrixis sign-in link',
      text: `As-salamu alaykum,\n\nClick to sign in to Lyrixis (valid 24 hours):\n${magicUrl}\n\nIf you did not request this, ignore this email.`,
    });

    return NextResponse.json({
      success: true,
      message: 'Check your email for the magic link',
    });
  } catch (error) {
    console.error('Magic link error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
