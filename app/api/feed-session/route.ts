import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { apixisSubOf } from "@/lib/apixis-login";

export const dynamic = "force-dynamic";

/**
 * GET /api/feed-session → { ok, token, expires_at, profile } for the signed-in person (401 when signed out).
 * Mints a short-lived family-feed token (Apixis.dev /api/feed/session) with this site's server-only
 * APIXIS_WORLD_KEY. The key never reaches the browser. Contract: Apixis.dev docs/FEED_API.md §1b.
 */
export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  let user: { email?: string | null; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } | null = null;
  try { user = (await (await createServerSupabaseClient()).auth.getUser()).data.user; } catch { user = null; }
  const sub = apixisSubOf(user as Parameters<typeof apixisSubOf>[0]);
  if (!user?.email || !sub) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const key = process.env.APIXIS_WORLD_KEY ?? "";
  if (!key) return NextResponse.json({ ok: false, error: "store_not_configured" }, { status: 503 });
  const base = (process.env.APIXIS_WORLD_API || "https://www.apixis.dev").replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/api/feed/session`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "x-apixis-client": "lyrixis",
        "x-apixis-sub": sub,
        "x-apixis-email": user.email,
        "content-type": "application/json",
      },
      body: JSON.stringify({ display_name: (user.user_metadata?.full_name as string | undefined) ?? undefined }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({ ok: false, error: "server_error" }));
    return NextResponse.json(data, { status: res.status, headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 502 });
  }
}
