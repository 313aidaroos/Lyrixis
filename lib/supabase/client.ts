import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client. NEXT_PUBLIC_* must be read as literal `process.env.NAME` so Next inlines
 * the value at build time. lib/env.ts reads `process.env[name]` dynamically, which is fine on
 * the server and EMPTY in the browser — the auth callback silently threw and every sign-in
 * hung on "Signing you in…" (verified live 2026-09-22).
 */
export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase browser env missing: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createBrowserClient(url, key);
}
