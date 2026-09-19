export type MarketVoice = {
  id: string;
  name: string;
  owner: string;
  vibe: string;
  xp: number;
  featured: boolean;
};

const SHELF: Omit<MarketVoice, "featured">[] = [
  { id: "warm-founder", name: "Warm founder", owner: "House", vibe: "Low, steady, brief", xp: 1000 },
  { id: "news-desk", name: "News desk", owner: "House", vibe: "Clear, evening bulletin", xp: 1000 },
  { id: "soft-narrator", name: "Soft narrator", owner: "House", vibe: "Calm, close, unhurried", xp: 1000 },
  { id: "arcade", name: "Arcade announcer", owner: "House", vibe: "Bright callouts", xp: 1000 },
  { id: "desert-radio", name: "Desert radio", owner: "House", vibe: "Dry, late-night", xp: 1000 },
];

/** Featured slot rotates every 6 hours. */
export function rotatingVoices(now = Date.now()): MarketVoice[] {
  const slot = Math.floor(now / (6 * 60 * 60 * 1000)) % SHELF.length;
  return SHELF.map((v, i) => ({ ...v, featured: i === slot }));
}
