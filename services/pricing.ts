import { createAdminClient } from "@/lib/supabase/admin";
import { HttpError } from "@/lib/errors";
import type { QuoteResult } from "@/types";

interface PricingTierRow {
  min_songs: number;
  max_songs: number | null;
  rate_cents: number;
}

interface OrgRow {
  custom_rate_cents: number | null;
}

/**
 * Server-side quote only. The frontend must never compute a charged price.
 *
 * Tier is determined by the size of the job being submitted (songCount),
 * not lifetime volume, unless the user belongs to an organization with
 * `custom_rate_cents`. A single-track checkout is always songCount = 1.
 */
export async function quote(userId: string, songCount: number): Promise<QuoteResult> {
  if (!Number.isInteger(songCount) || songCount < 1) {
    throw new HttpError(400, "invalid_song_count", "songCount must be a positive integer.");
  }

  const admin = createAdminClient();

  const { data: memberships, error: memberError } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId);

  if (memberError) {
    throw new HttpError(500, "org_lookup_failed", memberError.message);
  }

  const orgIds = (memberships ?? []).map((row: { organization_id: string }) => row.organization_id);
  if (orgIds.length > 0) {
    const { data: orgs, error: orgError } = await admin
      .from("organizations")
      .select("custom_rate_cents")
      .in("id", orgIds);

    if (orgError) {
      throw new HttpError(500, "org_lookup_failed", orgError.message);
    }

    const custom = (orgs as OrgRow[] | null)?.find((org) => org.custom_rate_cents !== null);
    if (custom?.custom_rate_cents !== null && custom?.custom_rate_cents !== undefined) {
      return {
        songCount,
        rateCents: custom.custom_rate_cents,
        amountCents: custom.custom_rate_cents * songCount,
        source: "custom",
        basis: "job_size",
      };
    }
  }

  const { data: tiers, error: tierError } = await admin
    .from("pricing_tiers")
    .select("min_songs, max_songs, rate_cents")
    .eq("active", true)
    .order("min_songs", { ascending: true });

  if (tierError) {
    throw new HttpError(500, "pricing_lookup_failed", tierError.message);
  }

  const tier = (tiers as PricingTierRow[] | null)?.find(
    (row) =>
      songCount >= row.min_songs &&
      (row.max_songs === null || songCount <= row.max_songs)
  );

  if (!tier) {
    throw new HttpError(
      500,
      "no_pricing_tier",
      "No active pricing tier covers this job size. Add rows to pricing_tiers."
    );
  }

  return {
    songCount,
    rateCents: tier.rate_cents,
    amountCents: tier.rate_cents * songCount,
    source: "tier",
    basis: "job_size",
  };
}
