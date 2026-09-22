import { Suspense } from "react";
import { CallbackClient } from "./callback-client";

export const dynamic = "force-dynamic";

/**
 * Magic-link landing. The OTP link is requested server-side with a plain client, so Supabase
 * issues an implicit-flow link: tokens arrive in the URL *hash*, which the browser never sends
 * to a Route Handler. The old handler looked for ?code= and bounced everyone to /login with the
 * tokens still in the address bar (verified live). This page reads the hash in the browser, sets
 * the cookie session, strips the tokens, then continues. PKCE ?code= links still work.
 */
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<p style={{ padding: 32 }}>Signing you in…</p>}>
      <CallbackClient />
    </Suspense>
  );
}
