import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    const next = request.nextUrl.searchParams.get('next') || '/dashboard';

    if (!token) {
      return NextResponse.redirect(new URL('/auth/login?error=no_token', request.url));
    }

    const admin = createAdminClient();

    // Verify token
    const { data: link, error } = await admin
      .from('magic_links')
      .select('email, used, expires_at')
      .eq('token', token)
      .maybeSingle();

    if (error || !link) {
      return NextResponse.redirect(new URL('/auth/login?error=invalid_token', request.url));
    }

    if (link.used) {
      return NextResponse.redirect(new URL('/auth/login?error=token_used', request.url));
    }

    if (new Date(link.expires_at) < new Date()) {
      return NextResponse.redirect(new URL('/auth/login?error=token_expired', request.url));
    }

    // Mark token as used
    await admin.from('magic_links').update({ used: true }).eq('token', token);

    // Find or create user
    const { data: user, error: userError } = await admin
      .from('users')
      .select('id, auth_id')
      .eq('email', link.email)
      .maybeSingle();

    let userId = user?.id;

    if (!user) {
      // Create new user
      const { data: newUser, error: createError } = await admin
        .from('users')
        .insert({
          email: link.email,
          role: link.email === 'awad@apixis.dev' ? 'admin' : 'user',
        })
        .select('id')
        .single();

      if (createError || !newUser) {
        return NextResponse.redirect(new URL('/auth/login?error=user_creation_failed', request.url));
      }

      userId = newUser.id;
    }

    // Set secure session cookie
    const cookieStore = await cookies();
    cookieStore.set('auth_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return NextResponse.redirect(new URL(next.startsWith('/') ? next : '/dashboard', request.url));
  } catch (error) {
    console.error('Magic link verification error:', error);
    return NextResponse.redirect(new URL('/auth/login?error=server_error', request.url));
  }
}
