-- 20261005_single_song_tier_300_ixis.sql (Grok / Developer Bot, 2026-10-05) — NOT applied by this PR.
-- The 1–99 songs tier was seeded at 299 (rate_cents; 100 Ixis = $1, so 299 Ixis) while the Apixis
-- Wallet SKU lyrixis.track.unlock charges 300 Ixis. Align the table with the Wallet.
-- The app already pins this tier to 300 in code (lib/ixis-pricing.ts), so applying this is a
-- data cleanup, not a behavior change.
-- Undo: update public.pricing_tiers set rate_cents = 299 where min_songs = 1 and max_songs = 99;
update public.pricing_tiers
   set rate_cents = 300
 where min_songs = 1
   and max_songs = 99
   and rate_cents = 299;
