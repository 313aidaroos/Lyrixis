import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Magic-link sign-in.
 *
 * Previously this minted its own token into `magic_links`, mailed a link to /auth/verify
 * (a page that does not exist — the handler lived at /api/auth/verify) and set an
 * `auth_session` cookie that nothing in the app reads: requireUser() is Supabase Auth.
 * So no one could ever sign in. Verified live 2026-09-22.
 *
 * Now: ask Supabase Auth for the OTP link. Supabase sends it through the project's SMTP
 * (Resend, from lyrixis@apixis.dev) and the existing /auth/callback exchanges the code
 * for a real session. One auth system, not two.
 */
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 3;
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json().catch(() => ({}));
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const limiter = requestCounts.get(ip);
    if (limiter && limiter.resetAt > now) {
      if (limiter.count >= RATE_LIMIT_MAX) {
        return NextResponse.json({ error: 'Too many requests. Try again in 1 minute.' }, { status: 429 });
      }
      limiter.count++;
    } else {
      requestCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return NextResponse.json({ error: 'Sign-in is not configured' }, { status: 503 });
    }

    const appUrl = (process.env.APP_URL || new URL(request.url).origin).replace(/\/$/, '');
    const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await auth.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent('/dashboard')}`,
      },
    });
    if (error) {
      console.error('signInWithOtp failed:', error.message);
      // Supabase rate-limits repeat sends to the same address; say so honestly.
      const status = /rate|seconds/i.test(error.message) ? 429 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ success: true, message: 'Check your email for the magic link' });
  } catch (error) {
    console.error('Magic link error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
