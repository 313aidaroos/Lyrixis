/**
 * Canonical Lyrixis prices in Ixis (100 Ixis = $1). Payments are Ixis only, through the shared
 * Apixis Wallet; Lyrixis takes no cards. (2026-10-05, Grok)
 *
 * The single-song price is the Wallet SKU `lyrixis.track.unlock` = 300 Ixis. The Wallet catalog is
 * the source of truth for what is actually charged; the 1–99 row in `pricing_tiers` (seeded at 299)
 * must show the same number, so the display code pins it to the SKU price until migration
 * 20261005_single_song_tier_300_ixis.sql is applied.
 */
export const TRACK_UNLOCK_SKU = "lyrixis.track.unlock";
export const TRACK_UNLOCK_IXIS = 300;

/** Per-song Ixis for a tier row: the 1-song tier always equals the Wallet SKU price. */
export function tierRateIxis(tier: { min_songs: number; rate_cents: number }): number {
  return tier.min_songs <= 1 ? TRACK_UNLOCK_IXIS : tier.rate_cents;
}
