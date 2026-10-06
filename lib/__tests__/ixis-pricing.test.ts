import { describe, expect, it } from "vitest";
import { TRACK_UNLOCK_IXIS, tierRateIxis } from "../ixis-pricing";

describe("Lyrixis pricing (Ixis only, Wallet SKU)", () => {
  it("the 1–99 tier always shows the Wallet SKU price, even with the old 299 seed", () => {
    expect(TRACK_UNLOCK_IXIS).toBe(300);
    expect(tierRateIxis({ min_songs: 1, rate_cents: 299 })).toBe(300);
    expect(tierRateIxis({ min_songs: 1, rate_cents: 300 })).toBe(300);
  });
  it("volume tiers keep the table's rate", () => {
    expect(tierRateIxis({ min_songs: 100, rate_cents: 149 })).toBe(149);
    expect(tierRateIxis({ min_songs: 10000, rate_cents: 40 })).toBe(40);
  });
});
