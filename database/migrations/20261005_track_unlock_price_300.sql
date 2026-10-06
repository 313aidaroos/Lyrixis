-- 2026-10-05 (Grok, Lyrixis Lead; Awad approved "go cleanup" 8:31 PM CT).
-- The single-track tier (1–99 songs) quoted 299 while the Wallet product lyrixis.track.unlock
-- charges 300 Ixis. Make them match. Applied to production mkuvgkjakxkytscfvnkf on 2026-10-05.
-- Undo: update public.pricing_tiers set rate_cents = 299 where min_songs = 1 and max_songs = 99 and rate_cents = 300;
update public.pricing_tiers
   set rate_cents = 300
 where min_songs = 1 and max_songs = 99 and rate_cents = 299;
