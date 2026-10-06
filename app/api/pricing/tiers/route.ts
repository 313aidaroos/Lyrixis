import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/errors";
import { tierRateIxis } from "@/lib/ixis-pricing";

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
    
    // 100 Ixis = $1, so rate_cents == Ixis. The 1–99 tier is pinned to the Wallet SKU
    // lyrixis.track.unlock (300 Ixis) so the table never says 299.
    const ixisTiers = (tiers ?? []).map((t) => ({
      min_songs: t.min_songs,
      max_songs: t.max_songs,
      rate_ixis: tierRateIxis(t),
    }));
    
    return Response.json({ tiers: ixisTiers });
  } catch (error) {
    return jsonError(error);
  }
}
