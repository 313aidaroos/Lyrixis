// GET  /api/apixis/world-agent  → the signed-in person's Apixis world agent state. For a NEW account
//      (created after the rollout, verified email) the first call asks Apixis.dev to create their own
//      agent (default Apixis body, 1000 in-world Ixis once) and records it on the auth user.
// POST /api/apixis/world-agent { action: "enter" | "dismiss" } → hides the one-time welcome card.
// Grok Developer Bot, 2026-09-28. Shared flow: Apixis.dev docs/APIXIS_ENTER.md "Automatic agent on signup".
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { welcomeSeenMetadata } from "@/lib/apixis-world-agent";
import { enterApixisUrl } from "@/lib/apixis-world";
import { ensureLyrixisWorldAgent, LYRIXIS_WORLD_CLIENT as CLIENT, saveUserAppMetadata as saveAppMetadata } from "@/lib/apixis-world-agent-server";

export const dynamic = "force-dynamic";

async function currentUser() {
  const sb = await createServerSupabaseClient();
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}

export async function GET() {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const view = await ensureLyrixisWorldAgent(user);
  return NextResponse.json({ ok: true, ...view, enterUrl: enterApixisUrl(CLIENT) }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const action = body?.action === "enter" ? "enter" : "dismiss";
  try {
    await saveAppMetadata(user.id, welcomeSeenMetadata(user.app_metadata, action));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "save_failed" }, { status: 500 });
  }
}
