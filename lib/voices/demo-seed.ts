import { createHash } from "node:crypto";
// DEMO DATA ONLY — fictional voices for the preview. Not real people, no testimonials, no earnings,
// no verification badges. Audio is a synthetic tone from the demo adapter, not a voice.
import type { VoicesRepo } from "./repo";
import type * as T from "./types";
import { demoWav } from "./providers/demo";
import { DEFAULT_PERMISSIONS, CLONING_CONSENT_TEXT } from "./service";
import { sha256 } from "./terms";
import { TERMS } from "./config";

export const DEMO_PERSONAS = {
  customer: { id: "00000000-0000-4000-8000-0000000000c1", email: "demo-customer@demo.lyrixis.invalid", name: "Demo customer", isAdmin: false },
  creator: { id: "00000000-0000-4000-8000-0000000000c2", email: "demo-creator@demo.lyrixis.invalid", name: "Demo creator", isAdmin: false },
  admin: { id: "00000000-0000-4000-8000-0000000000a1", email: "demo-admin@demo.lyrixis.invalid", name: "Demo admin", isAdmin: true },
} as const;
export type DemoPersona = keyof typeof DEMO_PERSONAS;

const VOICES: { slug: string; name: string; name_ar: string; desc: string; desc_ar: string; langs: string[]; dialects: string[]; tones: string[]; uses: string[]; mode: T.LicensingMode; publication: boolean; custom: boolean; hz: number }[] = [
  { slug: "demo-najdi-business", name: "Demo · Najdi business narrator", name_ar: "تجريبي · راوٍ نجدي للأعمال", desc: "Fictional demo voice. Calm Saudi (Najdi) delivery for corporate explainers.", desc_ar: "صوت تجريبي خيالي. أداء سعودي نجدي هادئ لفيديوهات الشركات.", langs: ["ar", "en"], dialects: ["ar-gulf-sa", "en-gulf"], tones: ["calm", "corporate"], uses: ["explainer", "corporate", "elearning"], mode: "instant", publication: true, custom: true, hz: 170 },
  { slug: "demo-emirati-warm", name: "Demo · Emirati warm host", name_ar: "تجريبي · مقدّمة إماراتية دافئة", desc: "Fictional demo voice. Friendly Emirati tone for social and ads.", desc_ar: "صوت تجريبي خيالي. نبرة إماراتية ودودة للإعلانات ووسائل التواصل.", langs: ["ar"], dialects: ["ar-gulf-ae"], tones: ["warm", "friendly"], uses: ["ads", "social"], mode: "instant", publication: true, custom: false, hz: 240 },
  { slug: "demo-egyptian-storyteller", name: "Demo · Egyptian storyteller", name_ar: "تجريبي · حكواتي مصري", desc: "Fictional demo voice. Expressive Egyptian Arabic for podcasts and narration.", desc_ar: "صوت تجريبي خيالي. عربية مصرية معبّرة للبودكاست والسرد.", langs: ["ar"], dialects: ["ar-egy"], tones: ["storyteller", "energetic"], uses: ["podcast", "social", "ads"], mode: "approval_required", publication: true, custom: false, hz: 200 },
  { slug: "demo-levantine-support", name: "Demo · Levantine support line", name_ar: "تجريبي · خط دعم شامي", desc: "Fictional demo voice. Clear Levantine Arabic for IVR and onboarding.", desc_ar: "صوت تجريبي خيالي. عربية شامية واضحة لأنظمة الهاتف والتعريف بالخدمات.", langs: ["ar"], dialects: ["ar-lev"], tones: ["calm", "friendly"], uses: ["ivr", "elearning"], mode: "instant", publication: false, custom: false, hz: 260 },
  { slug: "demo-msa-newsdesk", name: "Demo · MSA news desk", name_ar: "تجريبي · نشرة بالفصحى", desc: "Fictional demo voice. Formal Modern Standard Arabic.", desc_ar: "صوت تجريبي خيالي. عربية فصحى رسمية.", langs: ["ar"], dialects: ["ar-msa"], tones: ["authoritative", "corporate"], uses: ["corporate", "explainer", "elearning"], mode: "instant", publication: true, custom: false, hz: 150 },
  { slug: "demo-bilingual-gulf-en", name: "Demo · Bilingual Gulf / English", name_ar: "تجريبي · ثنائي اللغة خليجي/إنجليزي", desc: "Fictional demo voice. Switches between Gulf Arabic and English mid-sentence.", desc_ar: "صوت تجريبي خيالي. ينتقل بين الخليجية والإنجليزية في نفس الجملة.", langs: ["ar", "en"], dialects: ["ar-gulf-kw", "en-us"], tones: ["youthful", "energetic"], uses: ["ads", "social", "explainer"], mode: "instant", publication: true, custom: false, hz: 220 },
];

/** Deterministic ids so every serverless instance seeds identical demo rows. */
function did(name: string): string {
  const h = createHash("sha256").update(`lyxv-demo:${name}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export async function seedDemo(repo: VoicesRepo) {
  if (await repo.one("voice_pricing_configs", { version: 1 })) return;
  const now = new Date().toISOString();
  await repo.insert("voice_pricing_configs", { version: 1, payg_base_ixis: 500, payg_base_seconds: 60, payg_step_ixis: 250, payg_step_seconds: 30, payg_max_seconds: 300, audition_max_seconds: 15, free_auditions_per_day: 5, audition_ixis: 25, custom_min_ixis: 2500, custom_included_revisions: 1, illustrative: true, active: true, notes: "Awad 2026-10-04 defaults. Illustrative until verified against provider costs.", created_at: now });
  await repo.insert("voice_packages", { id: "solo_monthly", name: "Solo monthly", monthly_price_ixis: 2500, voiceovers_per_month: 8, overage_ixis: 400, seats: 1, brand_voice: false, wallet_product_key: "lyrixis.voice.solo.monthly", wallet_overage_product_key: "lyrixis.voice.overage.solo", illustrative: true, active: false, pricing_version: 1 });
  await repo.insert("voice_packages", { id: "label_enterprise", name: "Label / Enterprise", monthly_price_ixis: 15000, voiceovers_per_month: 50, overage_ixis: 300, seats: 5, brand_voice: true, wallet_product_key: "lyrixis.voice.label.monthly", wallet_overage_product_key: "lyrixis.voice.overage.label", illustrative: true, active: false, pricing_version: 1 });
  await repo.insert("voice_comp_rules", { applies_to: "generation", version: 1, creator_share_bps: 6000, apixis_fee_bps: 500, earnings_hold_days: 14, share_base: "licensing_minus_fee_minus_provider_cost", notes: "Creator 60% of (licensing − 5% Apixis fee − provider cost).", effective_from: "2026-10-04T00:00:00.000Z" });
  await repo.insert("voice_comp_rules", { applies_to: "custom_recording", version: 1, creator_share_bps: 8000, apixis_fee_bps: 500, earnings_hold_days: 14, share_base: "licensing_minus_fee_minus_provider_cost", notes: "Custom: creator 80% (Lyrixis keeps 20%) after 5% Apixis fee.", effective_from: "2026-10-04T00:00:00.000Z" });

  for (const p of Object.values(DEMO_PERSONAS)) {
    await repo.insert("users", { id: p.id, email: p.email, full_name: p.name, role: p.isAdmin ? "admin" : "user" });
    await repo.insert("voice_invites", { email: p.email, role: "both", invited_by: null, note: "demo persona", revoked_at: null });
  }
  const ws = await repo.insert("voice_workspaces", { id: "00000000-0000-4000-8000-0000000000f1", name: "Demo business (sample data)", brand_name: "Demo Co.", owner_user_id: DEMO_PERSONAS.customer.id, preferred_voice_id: null, package_id: null, allowance_voiceovers: 0, allowance_period_end: null, seats_limit: 1, credit_ixis: 0, monthly_spend_cap_ixis: 10000, socixis_org_id: "demo-socixis-org", is_demo: true });
  await repo.insert("voice_workspace_members", { workspace_id: ws.id, user_id: DEMO_PERSONAS.customer.id, role: "owner" });

  for (const [i, v] of VOICES.entries()) {
    const userId = i === 0 ? DEMO_PERSONAS.creator.id : `00000000-0000-4000-8000-0000000001${String(i).padStart(2, "0")}`;
    if (i !== 0) await repo.insert("users", { id: userId, email: `demo-creator-${i}@demo.lyrixis.invalid`, full_name: `Demo creator ${i}`, role: "user" });
    const creator = await repo.insert("voice_creators", { id: did(`creator:${i}`), user_id: userId, handle: `demo-creator-${i + 1}`, display_name: `Demo creator ${i + 1}`, display_name_ar: `صانع تجريبي ${i + 1}`, bio: "Fictional demo profile for the Lyrixis Voices preview. Not a real person.", bio_ar: "ملف تجريبي خيالي لمعاينة أصوات ليريكسيس. ليس شخصًا حقيقيًا.", adult_attested_at: now, identity_check_status: "not_started", payout_status: "blocked_no_payout_rail", wallet_owner: null, status: "active", hire_enabled: v.custom, is_demo: true });
    const voice = await repo.insert("voices", { id: did(`voice:${v.slug}`), slug: v.slug, creator_id: creator.id, display_name: v.name, display_name_ar: v.name_ar, description: v.desc, description_ar: v.desc_ar, languages: v.langs, dialects: v.dialects, tones: v.tones, use_categories: v.uses, status: "active", status_reason: null, verification_status: "unverified", dialect_review_status: "pending", licensing_mode: v.mode, current_permission_version: 1, model_version: "demo-1", provider: "demo", provider_voice_ref: `demo:${v.slug}`, is_demo: true, submitted_at: now, approved_at: now });
    await repo.insert("voice_permission_versions", { ...DEFAULT_PERMISSIONS, voice_id: voice.id, version: 1, auditions: true, paid_generation: true, publication: v.publication, custom_recordings: v.custom, assistant_use: true, allowed_uses: v.uses, allowed_channels: [], created_at: now });
    await repo.insert("voice_consents", { id: did(`consent:${v.slug}`), creator_id: creator.id, voice_id: voice.id, kind: "cloning", terms_version: TERMS.cloning_consent, text_hash: sha256(CLONING_CONSENT_TEXT), ip_hash: null, revoked_at: null, revoke_reason: null });
    const lines = v.langs.includes("en") ? ["Demo sample — synthetic tone, not a real voice.", "عيّنة تجريبية — نغمة اصطناعية وليست صوتًا حقيقيًا."] : ["عيّنة تجريبية — نغمة اصطناعية وليست صوتًا حقيقيًا."];
    for (const [j, line] of lines.entries()) {
      const path = `${voice.id}/demo-${j}`;
      const body = demoWav(line, 4, v.hz);
      await repo.putObject("voices-public-samples", path, body, "audio/wav");
      await repo.insert("voice_samples", { id: did(`sample:${v.slug}:${j}`), voice_id: voice.id, title: j === 0 && v.langs.includes("en") ? "Demo sample (EN)" : "عيّنة تجريبية (AR)", language: j === 0 && v.langs.includes("en") ? "en" : "ar", dialect: v.dialects[Math.min(j, v.dialects.length - 1)], transcript: line, storage_bucket: "voices-public-samples", storage_path: path, mime_type: "audio/wav", bytes: body.byteLength, creator_approved: true, admin_approved: true, is_demo: true });
    }
  }
}
