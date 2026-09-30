import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { CallbackClient } from "./callback-client";

export const dynamic = "force-dynamic";

function safeNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

/**
 * Magic-link landing. Handles THREE flows:
 * 1. token_hash (from admin.generateLink) → server-side verifyOtp
 * 2. ?code= (PKCE) → client-side exchangeCodeForSession
 * 3. #access_token (implicit) → client-side setSession
 * 
 * CRITICAL BUG FIX: verifyOtp type: "email" accepts both "signup" (new user) and "magiclink" (existing).
 * Using type: "magiclink" causes otp_expired for brand-new emails. Reference: Ominix 3d17c68.
 */
export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const token_hash = typeof params.token_hash === "string" ? params.token_hash : null;
  const next = safeNext(typeof params.next === "string" ? params.next : null);

  // Server-side: handle token_hash magic links
  if (token_hash) {
    const cookieJar = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieJar.getAll(),
          setAll: (list: Array<{ name: string; value: string; options: CookieOptions }>) => {
            list.forEach(({ name, value, options }) => {
              cookieJar.set(name, value, options);
            });
          },
        },
      }
    );

    // CRITICAL: type: "email" works for both signup + magiclink tokens
    const { error } = await supabase.auth.verifyOtp({
      type: "email",
      token_hash,
    });

    if (error) {
      console.error("[auth/callback] verifyOtp error:", error);
      redirect(`/login?error=link_expired&next=${encodeURIComponent(next)}`);
    }

    // Success - redirect with session cookies set
    redirect(next);
  }

  // Client-side: PKCE (?code=) and implicit (#access_token) flows
  return (
    <Suspense fallback={<p style={{ padding: 32 }}>Signing you in…</p>}>
      <CallbackClient />
    </Suspense>
  );
}
