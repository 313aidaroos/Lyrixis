import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { buyIxisUrl, walletBalance, WalletError } from "@/lib/apixis-wallet";
import { apixisSubOf } from "@/lib/apixis-login";

export const dynamic = "force-dynamic";

/**
 * The signed-in person's ONE Apixis Wallet balance (shared by every Apixis site), plus the
 * "Buy Ixis" link that goes to the Wallet and comes straight back here.
 */
export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const back = request.headers.get("referer")?.startsWith(origin) ? request.headers.get("referer")! : origin + "/";
  const buy = buyIxisUrl("lyrixis", back);
  if (!url || !key) return NextResponse.json({ available: null, buy });
  const jar = await cookies();
  const supabase = createServerClient(url, key, { cookies: { getAll: () => jar.getAll(), setAll: () => undefined } });
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.json({ available: null, buy, signIn: true }, { status: 401 });
  const owner = apixisSubOf(user) ?? user.email ?? null;
  if (!owner) return NextResponse.json({ available: null, buy });
  try {
    const balance = await walletBalance(owner, { history: 10 });
    return NextResponse.json({ ...balance, buy }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const signInWithApixis = error instanceof WalletError && (error.status === 403 || error.status === 404);
    return NextResponse.json({ available: null, buy, signInWithApixis }, { status: signInWithApixis ? 200 : 503 });
  }
}
