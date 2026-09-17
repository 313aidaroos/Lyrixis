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
    return Response.json({ tiers: tiers ?? [] });
  } catch (error) {
    return jsonError(error);
  }
}
