import { describe, expect, it } from "vitest";
import { CIXY_SYSTEM_PROMPT } from "../cixy-prompt";
import { CIXY_CORE } from "../apixis-cixy";

describe("Lyrixis Cixy prompt", () => {
  it("starts with the shared family core v2", () => {
    expect(CIXY_SYSTEM_PROMPT.startsWith(CIXY_CORE)).toBe(true);
    expect(CIXY_SYSTEM_PROMPT).toContain("specialized here as Lyrixis's native AI");
  });

  it("has no religious content outside Halaxis (Awad lock 2026-10-04)", () => {
    expect(CIXY_SYSTEM_PROMPT).not.toMatch(
      /salaam|salam|insha|alhamdulillah|bismillah|halal|haram|prayer|ramadan|hijri|\beid\b|jumu|suhoor|iftar|mawlid|muslim|islam|scholar|riba|alcohol|pork|gambl/i,
    );
  });
});
