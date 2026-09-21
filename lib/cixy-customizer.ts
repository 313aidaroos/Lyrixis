/**
 * Lyrixis Cixy wardrobe inventory.
 * One signature Cixy. Paid slots carry a Coming soon label and a Wallet SKU
 * placeholder — never a dollar or Ixis amount. Awad sets prices later.
 */

export const CIXY_PRICE_LABEL = "Coming soon" as const;

export const CIXY_LOOK_STORAGE_KEY = "lyrixis.cixy.look";

/** Sprite-sheet columns, left to right. Two frames each, stacked. */
export const CIXY_MOODS = [
  { id: "smile", label: "Smile", frame: 0 },
  { id: "wave", label: "Wave", frame: 1 },
  { id: "sleep", label: "Sleep", frame: 2 },
  { id: "snack", label: "Snack", frame: 3 },
  { id: "coffee", label: "Coffee", frame: 4 },
] as const;

export type CixyMoodId = (typeof CIXY_MOODS)[number]["id"];

export interface CixyOwnedOption {
  id: string;
  name: string;
  description: string;
  access: "owned";
}

export interface CixyPaidOption {
  id: string;
  name: string;
  description: string;
  access: "paid";
  priceLabel: typeof CIXY_PRICE_LABEL;
  walletSku: string;
}

export type CixyOption = CixyOwnedOption | CixyPaidOption;

export const CIXY_OPTION_GROUPS = [
  {
    id: "skin",
    label: "Skin",
    options: [
      {
        id: "signature",
        name: "Signature",
        description: "The complexion already in the signature art.",
        access: "owned",
      },
      {
        id: "stage-warm",
        name: "Stage warm",
        description: "Warm stage light on the same face. Layer art pending.",
        access: "paid",
        priceLabel: CIXY_PRICE_LABEL,
        walletSku: "lyrixis.cixy.skin.stage-warm",
      },
      {
        id: "booth-cool",
        name: "Booth cool",
        description: "Cool booth light on the same face. Layer art pending.",
        access: "paid",
        priceLabel: CIXY_PRICE_LABEL,
        walletSku: "lyrixis.cixy.skin.booth-cool",
      },
    ],
  },
  {
    id: "hairStyle",
    label: "Hair style",
    options: [
      {
        id: "signature-updo",
        name: "Signature updo",
        description: "The updo in the signature art.",
        access: "owned",
      },
      {
        id: "session-waves",
        name: "Session waves",
        description: "Longer studio waves. Layer art pending.",
        access: "paid",
        priceLabel: CIXY_PRICE_LABEL,
        walletSku: "lyrixis.cixy.hair.style.session-waves",
      },
      {
        id: "booth-bob",
        name: "Booth bob",
        description: "Shorter booth cut. Layer art pending.",
        access: "paid",
        priceLabel: CIXY_PRICE_LABEL,
        walletSku: "lyrixis.cixy.hair.style.booth-bob",
      },
    ],
  },
  {
    id: "hairColor",
    label: "Hair color",
    options: [
      {
        id: "signature-brown",
        name: "Signature brown",
        description: "The brown hair in the signature art.",
        access: "owned",
      },
      {
        id: "midnight",
        name: "Midnight",
        description: "Darker studio color. Layer art pending.",
        access: "paid",
        priceLabel: CIXY_PRICE_LABEL,
        walletSku: "lyrixis.cixy.hair.color.midnight",
      },
      {
        id: "copper",
        name: "Copper",
        description: "Copper studio color. Layer art pending.",
        access: "paid",
        priceLabel: CIXY_PRICE_LABEL,
        walletSku: "lyrixis.cixy.hair.color.copper",
      },
    ],
  },
  {
    id: "eyes",
    label: "Eyes",
    options: [
      {
        id: "signature-brown",
        name: "Signature brown",
        description: "The brown eyes in the signature art.",
        access: "owned",
      },
      {
        id: "amber",
        name: "Amber",
        description: "Amber on the same face. Layer art pending.",
        access: "paid",
        priceLabel: CIXY_PRICE_LABEL,
        walletSku: "lyrixis.cixy.eyes.amber",
      },
      {
        id: "hazel",
        name: "Hazel",
        description: "Hazel on the same face. Layer art pending.",
        access: "paid",
        priceLabel: CIXY_PRICE_LABEL,
        walletSku: "lyrixis.cixy.eyes.hazel",
      },
    ],
  },
  {
    id: "outfit",
    label: "Outfit",
    options: [
      {
        id: "signature-blazer",
        name: "Signature blazer",
        description: "Forest green blazer baked into the signature art.",
        access: "owned",
      },
      {
        id: "session",
        name: "Session suit",
        description: "Tailored studio suit. Layer art pending.",
        access: "paid",
        priceLabel: CIXY_PRICE_LABEL,
        walletSku: "lyrixis.cixy.outfit.session",
      },
      {
        id: "stage",
        name: "Stage set",
        description: "Performance set. Layer art pending.",
        access: "paid",
        priceLabel: CIXY_PRICE_LABEL,
        walletSku: "lyrixis.cixy.outfit.stage",
      },
      {
        id: "off-duty",
        name: "Off-duty",
        description: "Weekend layer. Layer art pending.",
        access: "paid",
        priceLabel: CIXY_PRICE_LABEL,
        walletSku: "lyrixis.cixy.outfit.off-duty",
      },
    ],
  },
  {
    id: "office",
    label: "Office",
    options: [
      {
        id: "signature-desk",
        name: "Signature desk",
        description: "The desk already in the signature art.",
        access: "owned",
      },
      {
        id: "mastering",
        name: "Mastering suite",
        description: "Mastering-room template. Layer art pending.",
        access: "paid",
        priceLabel: CIXY_PRICE_LABEL,
        walletSku: "lyrixis.cixy.office.mastering",
      },
      {
        id: "writers-room",
        name: "Writer's room",
        description: "Writing-room template. Layer art pending.",
        access: "paid",
        priceLabel: CIXY_PRICE_LABEL,
        walletSku: "lyrixis.cixy.office.writers-room",
      },
      {
        id: "live-room",
        name: "Live room",
        description: "Live-room template. Layer art pending.",
        access: "paid",
        priceLabel: CIXY_PRICE_LABEL,
        walletSku: "lyrixis.cixy.office.live-room",
      },
    ],
  },
] as const satisfies readonly {
  id: string;
  label: string;
  options: readonly CixyOption[];
}[];

export type CixyGroupId = (typeof CIXY_OPTION_GROUPS)[number]["id"];

export type CixyLook = Record<CixyGroupId, string>;

/** Empty overlay wells. Hair style and hair color share the hair well. */
export const CIXY_WARDROBE_SLOTS = [
  { id: "skin", label: "Skin", groups: ["skin"] },
  { id: "hair", label: "Hair", groups: ["hairStyle", "hairColor"] },
  { id: "eyes", label: "Eyes", groups: ["eyes"] },
  { id: "outfit", label: "Outfit", groups: ["outfit"] },
  { id: "office", label: "Office", groups: ["office"] },
] as const satisfies readonly { id: string; label: string; groups: readonly CixyGroupId[] }[];

export function cixyGroup(groupId: CixyGroupId) {
  const group = CIXY_OPTION_GROUPS.find((item) => item.id === groupId);
  if (!group) throw new Error(`Unknown Cixy option group: ${groupId}`);
  return group;
}

export function cixyOption(groupId: CixyGroupId, optionId: string): CixyOption | undefined {
  return cixyGroup(groupId).options.find((option) => option.id === optionId);
}

export function defaultOptionId(groupId: CixyGroupId): string {
  const owned = cixyGroup(groupId).options.find((option) => option.access === "owned");
  if (!owned) throw new Error(`Cixy group ${groupId} has no owned default.`);
  return owned.id;
}

export function defaultCixyLook(): CixyLook {
  return {
    skin: defaultOptionId("skin"),
    hairStyle: defaultOptionId("hairStyle"),
    hairColor: defaultOptionId("hairColor"),
    eyes: defaultOptionId("eyes"),
    outfit: defaultOptionId("outfit"),
    office: defaultOptionId("office"),
  };
}

export function isOwnedOption(groupId: CixyGroupId, optionId: string): boolean {
  return cixyOption(groupId, optionId)?.access === "owned";
}

/** Keep owned ids only. Paid or unknown ids fall back to the signature default. */
export function sanitizeCixyLook(value: unknown): CixyLook {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const look = defaultCixyLook();
  for (const group of CIXY_OPTION_GROUPS) {
    const candidate = source[group.id];
    if (typeof candidate === "string" && isOwnedOption(group.id, candidate)) {
      look[group.id] = candidate;
    }
  }
  return look;
}

export function readStoredCixyLook(raw: string | null): CixyLook {
  if (!raw) return defaultCixyLook();
  try {
    return sanitizeCixyLook(JSON.parse(raw));
  } catch {
    return defaultCixyLook();
  }
}
