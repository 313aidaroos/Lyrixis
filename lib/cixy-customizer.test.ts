import { describe, expect, it } from "vitest";
import {
  CIXY_MOODS,
  CIXY_OPTION_GROUPS,
  CIXY_WARDROBE_SLOTS,
  defaultCixyLook,
  isOwnedOption,
  readStoredCixyLook,
  sanitizeCixyLook,
} from "@/lib/cixy-customizer";

const GROUP_IDS = ["skin", "hairStyle", "hairColor", "eyes", "outfit", "office"];

describe("Cixy customizer inventory", () => {
  it("lists the six option groups with an owned default and paid Coming soon slots", () => {
    expect(CIXY_OPTION_GROUPS.map((group) => group.id)).toEqual(GROUP_IDS);

    for (const group of CIXY_OPTION_GROUPS) {
      const owned = group.options.filter((option) => option.access === "owned");
      const paid = group.options.filter((option) => option.access === "paid");
      expect(owned.length).toBeGreaterThan(0);
      expect(paid.length).toBeGreaterThan(0);

      for (const option of paid) {
        expect(option.priceLabel).toBe("Coming soon");
        expect(option.walletSku.startsWith("lyrixis.cixy.")).toBe(true);
        expect(option).not.toHaveProperty("price");
        expect(option).not.toHaveProperty("amount");
      }
    }
  });

  it("does not invent dollar or Ixis amounts", () => {
    const blob = JSON.stringify(CIXY_OPTION_GROUPS);
    expect(blob).not.toMatch(/\$\s*\d/);
    expect(blob).not.toMatch(/\d[\d,]*\s*Ixis/i);
    expect(blob).not.toMatch(/"price"\s*:/);
  });

  it("covers hair, outfit, and office wardrobe slots", () => {
    const slotIds = CIXY_WARDROBE_SLOTS.map((slot) => slot.id);
    expect(slotIds).toEqual(expect.arrayContaining(["hair", "outfit", "office", "skin", "eyes"]));
  });

  it("ships the five signature sprite moods", () => {
    expect(CIXY_MOODS.map((mood) => mood.id)).toEqual(["smile", "wave", "sleep", "snack", "coffee"]);
  });

  it("persists owned defaults and drops paid or unknown ids", () => {
    const look = defaultCixyLook();
    expect(look).toEqual({
      skin: "signature",
      hairStyle: "signature-updo",
      hairColor: "signature-brown",
      eyes: "signature-brown",
      outfit: "signature-blazer",
      office: "signature-desk",
    });
    for (const group of CIXY_OPTION_GROUPS) {
      expect(isOwnedOption(group.id, look[group.id])).toBe(true);
    }

    const sanitized = sanitizeCixyLook({
      skin: "stage-warm",
      hairStyle: "signature-updo",
      outfit: "session",
      office: "not-a-room",
    });
    expect(sanitized.skin).toBe("signature");
    expect(sanitized.hairStyle).toBe("signature-updo");
    expect(sanitized.outfit).toBe("signature-blazer");
    expect(sanitized.office).toBe("signature-desk");
    expect(readStoredCixyLook("not-json")).toEqual(defaultCixyLook());
    expect(readStoredCixyLook(JSON.stringify(look))).toEqual(look);
  });
});
