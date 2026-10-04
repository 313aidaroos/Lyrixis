import { Suspense } from "react";
import { CallbackClient } from "./callback-client";

export const dynamic = "force-dynamic";

/**
 * Magic-link landing. Handles THREE flows:
 * 1. token_hash (from admin.generateLink) → middleware verifyOtp with cookies
 * 2. ?code= (PKCE) → client-side exchangeCodeForSession
 * 3. #access_token (implicit) → client-side setSession
 * 
 * CRITICAL BUG FIX: verifyOtp type: "email" accepts both "signup" (new user) and "magiclink" (existing).
 * Using type: "magiclink" causes otp_expired for brand-new emails. Reference: Ominix 3d17c68, 78d2af9.
 */
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<p style={{ padding: 32 }}>Signing you in…</p>}>
      <CallbackClient />
    </Suspense>
  );
}
