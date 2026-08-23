import { getDb } from "@/lib/db";

export async function quotePriceCents(songCount: number): Promise<number> {
  const db = getDb();
  const tiers = db
    .prepare(
      `SELECT min_songs, max_songs, rate_cents FROM pricing_tiers
       WHERE active = 1 ORDER BY min_songs ASC`
    )
    .all() as { min_songs: number; max_songs: number | null; rate_cents: number }[];

  const tier = tiers.find(
    (t) =>
      songCount >= t.min_songs &&
      (t.max_songs === null || songCount <= t.max_songs)
  );
  if (!tier) throw new Error("No pricing tier found");
  return tier.rate_cents * songCount;
}

export async function rateForSongCount(songCount: number): Promise<number> {
  const db = getDb();
  const tiers = db
    .prepare(
      `SELECT min_songs, max_songs, rate_cents FROM pricing_tiers
       WHERE active = 1 ORDER BY min_songs ASC`
    )
    .all() as { min_songs: number; max_songs: number | null; rate_cents: number }[];

  const tier = tiers.find(
    (t) =>
      songCount >= t.min_songs &&
      (t.max_songs === null || songCount <= t.max_songs)
  );
  if (!tier) throw new Error("No pricing tier found");
  return tier.rate_cents;
}
