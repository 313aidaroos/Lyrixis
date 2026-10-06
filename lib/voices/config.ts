// Lyrixis Voices — static taxonomy and constants. Prices are NOT here (voice_pricing_configs).

export const VOICES_OWNER_ADMIN_EMAILS = ["alaidaroosawad@gmail.com", "awad@apixis.dev"] as const;

export const IXIS_PER_USD = 100;

export const LANGUAGES = [
  { id: "ar", label: "Arabic", label_ar: "العربية" },
  { id: "en", label: "English", label_ar: "الإنجليزية" },
] as const;

/** Dialects are stored explicitly; "Arabic" alone is never enough. */
export const DIALECTS = [
  { id: "ar-msa", language: "ar", label: "Modern Standard Arabic", label_ar: "الفصحى" },
  { id: "ar-gulf-sa", language: "ar", label: "Gulf — Saudi (Najdi/Hijazi)", label_ar: "خليجي — سعودي" },
  { id: "ar-gulf-ae", language: "ar", label: "Gulf — Emirati", label_ar: "خليجي — إماراتي" },
  { id: "ar-gulf-kw", language: "ar", label: "Gulf — Kuwaiti", label_ar: "خليجي — كويتي" },
  { id: "ar-egy", language: "ar", label: "Egyptian", label_ar: "مصري" },
  { id: "ar-lev", language: "ar", label: "Levantine", label_ar: "شامي" },
  { id: "ar-mag", language: "ar", label: "Maghrebi", label_ar: "مغاربي" },
  { id: "ar-irq", language: "ar", label: "Iraqi", label_ar: "عراقي" },
  { id: "ar-yem", language: "ar", label: "Yemeni", label_ar: "يمني" },
  { id: "en-us", language: "en", label: "English — US", label_ar: "إنجليزي أمريكي" },
  { id: "en-gb", language: "en", label: "English — UK", label_ar: "إنجليزي بريطاني" },
  { id: "en-gulf", language: "en", label: "English — Gulf-accented", label_ar: "إنجليزي بلكنة خليجية" },
] as const;

export const TONES = ["warm", "authoritative", "friendly", "calm", "energetic", "corporate", "storyteller", "youthful"] as const;

export const USES = [
  { id: "explainer", label: "Explainer / product video" },
  { id: "ads", label: "Advertising" },
  { id: "elearning", label: "E-learning & training" },
  { id: "ivr", label: "Phone system / IVR" },
  { id: "corporate", label: "Corporate & internal comms" },
  { id: "podcast", label: "Podcast & narration" },
  { id: "social", label: "Social media" },
] as const;

export const CHANNELS = ["web", "social", "broadcast_tv", "radio", "in_app", "internal", "phone"] as const;
export const TERRITORIES = ["worldwide", "gcc", "mena", "us", "eu"] as const;

/** Always blocked regardless of creator settings. */
export const ALWAYS_BLOCKED_USES = ["political", "adult", "impersonation", "fraud", "hate"] as const;

export const TERMS = {
  license: "voices-license-2026-10-04-draft",
  cloning_consent: "voices-cloning-consent-2026-10-04-draft",
  creator_terms: "voices-creator-terms-2026-10-04-draft",
  customer_terms: "voices-customer-terms-2026-10-04-draft",
} as const;

export const LEGAL_REVIEW_NOTE = "Draft — requires legal review before launch.";

/** Wallet product ids Lyrixis Voices will call. Must be registered in the Apixis Wallet catalog (Wallet lead). */
export const WALLET_PRODUCTS = {
  generateTiers: [60, 90, 120, 150, 180, 210, 240, 270, 300].map((s) => ({ seconds: s, key: `lyrixis.voice.generate.${s}s` })),
  custom: "lyrixis.voice.custom",
  audition: "lyrixis.voice.audition",
  soloMonthly: "lyrixis.voice.solo.monthly",
  labelMonthly: "lyrixis.voice.label.monthly",
  overageSolo: "lyrixis.voice.overage.solo",
  overageLabel: "lyrixis.voice.overage.label",
} as const;

export const AUDITION_MAX_CHARS = 250; // hard cap; the 15s duration cap (pricing config) is checked too
export const AUDITION_LIMIT_PER_HOUR = 20; // abuse limit per user, on top of the daily free allowance
export const AUDITION_DAILY_BUDGET_USD_MICROS = 2_000_000; // $2/day platform-wide cap (demo adapter costs 0)
export const SCRIPT_MAX_CHARS = 5000;

export const SAMPLE_MAX_BYTES = 10 * 1024 * 1024;
export const TRAINING_MAX_BYTES = 100 * 1024 * 1024;
export const SAMPLE_MIME = ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/ogg"] as const;
export const TRAINING_MIME = ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/flac", "audio/mp4"] as const;
export const TRAINING_RETENTION_DAYS = 365;
export const SCRIPT_RETENTION_DAYS = 180;
export const SIGNED_URL_TTL_SECONDS = 300;

/** Names creators may not use for a voice (anti-impersonation). Admin review catches the rest. */
export const RESERVED_NAME_PATTERNS = [
  /\bcixy\b/i, /\blyrixis\b/i, /\bapixis\b/i, /\bofficial\b/i, /\bverified\b/i,
  /\b(king|prince|sheikh|president|minister)\b/i, /(^|[\s\u0640-\u064f]|ال)(ملك|أمير|الأمير|شيخ|الشيخ|رئيس|الرئيس|وزير|الوزير)(?=$|\s)/u,
];

export function isOwnerAdminEmail(email: string | null | undefined): boolean {
  return !!email && (VOICES_OWNER_ADMIN_EMAILS as readonly string[]).includes(email.trim().toLowerCase());
}

export function dialectLabel(id: string): string {
  return DIALECTS.find((d) => d.id === id)?.label ?? id;
}
