import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data: tiers, error } = await admin
      .from("pricing_tiers")
      .select("min_songs, max_songs, rate_cents")
      .eq("active", true)
      .order("min_songs", { ascending: true });

    if (error) throw error;
    
    // Convert rate_cents to rate_ixis (100 Ixis = $1, so Ixis = cents * 100 / 100 = cents)
    const ixisTiers = (tiers ?? []).map((t) => ({
      min_songs: t.min_songs,
      max_songs: t.max_songs,
      rate_ixis: t.rate_cents, // 299 cents = 299 Ixis = $2.99
    }));
    
    return Response.json({ tiers: ixisTiers });
  } catch (error) {
    return jsonError(error);
  }
}
