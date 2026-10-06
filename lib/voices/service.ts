// Lyrixis Voices — business rules. Every route calls these; nothing writes around them.
import { createHash, randomBytes } from "node:crypto";
import type { VoicesRepo } from "./repo";
import { ConflictError } from "./repo";
import type * as T from "./types";
import type { WalletPort } from "./wallet-port";
import { providerFor, ProviderError, type VoiceProvider } from "./providers";
import { VoicesError, bad, conflict, deny, notFound } from "./errors";
import { sanitizeMeta, safeError } from "./sanitize";
import { assertAllowedName, similarName, validateUpload, wavSeconds } from "./validation";
import { normalizeScript, scriptHash, sha256, termsHash, licenseSummary } from "./terms";
import { allowanceUnitValue, allowanceUnits, billedSeconds, estimateSeconds, ixisToUsd, paygPriceIxis, usdMicrosToIxisCeil, walletProductFor } from "./pricing";
import { ACCOUNTS, allowanceSpendTx, allowanceTopupTx, captureTx, creditNormal, refundTx, releaseTx, splitAmount, type Split } from "./ledger";
import {
  ALWAYS_BLOCKED_USES, AUDITION_DAILY_BUDGET_USD_MICROS, AUDITION_LIMIT_PER_HOUR, AUDITION_MAX_CHARS, LEGAL_REVIEW_NOTE,
  SCRIPT_MAX_CHARS, SCRIPT_RETENTION_DAYS, SIGNED_URL_TTL_SECONDS, TERMS, TRAINING_RETENTION_DAYS, WALLET_PRODUCTS, isOwnerAdminEmail,
} from "./config";

export interface Actor { userId: string; email: string; walletOwner: string; isAdmin: boolean; kind?: "user" | "api_key" }

export interface ServiceDeps {
  repo: VoicesRepo;
  wallet: WalletPort;
  providers?: Record<string, VoiceProvider>;
  inviteOnly?: boolean;
  now?: () => Date;
  mode: "demo" | "live";
}

export interface LicenseRequest {
  script: string;
  declared_use: string;
  channels: string[];
  publication: boolean;
  territory: string;
  term_months: number;
  project_id?: string | null;
}

export const CLONING_CONSENT_TEXT = `I confirm that the voice in the training audio is my own, that I am 18 or older, and that I
consent to Lyrixis and its voice provider creating a synthetic model of my voice, used only within the
permissions I set, which I can pause or retire at any time. Training audio is never published.
${LEGAL_REVIEW_NOTE}`;
export const CREATOR_TERMS_TEXT = `Lyrixis Voices creator terms (draft). Earnings are not guaranteed. ${LEGAL_REVIEW_NOTE}`;

const nowIso = (d: Date) => d.toISOString();

export class VoicesService {
  readonly repo: VoicesRepo;
  readonly wallet: WalletPort;
  private providers?: Record<string, VoiceProvider>;
  private now: () => Date;
  readonly mode: "demo" | "live";
  readonly inviteOnly: boolean;
  private auditionHits = new Map<string, number[]>();

  constructor(d: ServiceDeps) {
    this.repo = d.repo; this.wallet = d.wallet; this.providers = d.providers; this.now = d.now ?? (() => new Date());
    this.mode = d.mode; this.inviteOnly = d.inviteOnly ?? false;
  }

  // ------------------------------------------------------------ audit / access
  async audit(actor: Actor | null, category: T.AuditRow["category"], action: string, entityType: string | null, entityId: string | null, meta?: Record<string, unknown>) {
    await this.repo.insert("voice_audit_events", {
      actor_user_id: actor?.kind === "api_key" ? null : actor?.userId ?? null,
      actor_kind: !actor ? "system" : actor.kind === "api_key" ? "api_key" : actor.isAdmin ? "admin" : "user",
      category, action, entity_type: entityType, entity_id: entityId, metadata: sanitizeMeta(meta),
    }).catch(() => undefined);
  }

  isAdmin(actor: Actor | null): boolean { return !!actor && (actor.isAdmin || isOwnerAdminEmail(actor.email)); }

  requireAdmin(actor: Actor | null): Actor {
    if (!actor || !this.isAdmin(actor)) throw deny("admin_only", "Voices admins only.");
    return actor;
  }

  async hasAccess(actor: Actor | null): Promise<boolean> {
    if (!this.inviteOnly) return true;
    if (!actor) return false;
    if (this.isAdmin(actor)) return true;
    const inv = await this.repo.one("voice_invites", { email: actor.email.toLowerCase() });
    return !!inv && !inv.revoked_at;
  }

  async requireAccess(actor: Actor | null): Promise<Actor> {
    if (!actor) throw new VoicesError(401, "sign_in", "Sign in with your Apixis ID to continue.");
    if (!(await this.hasAccess(actor))) throw deny("invite_only", "Lyrixis Voices is invite-only right now.");
    return actor;
  }

  // ------------------------------------------------------------ config
  async pricing(): Promise<T.PricingConfigRow> {
    const c = await this.repo.one("voice_pricing_configs", { active: true });
    if (!c) throw new VoicesError(503, "pricing_missing", "No active Voices pricing config.");
    return c;
  }
  async compRule(kind: "generation" | "custom_recording" = "generation"): Promise<T.CompRuleRow> {
    const rules = await this.repo.find("voice_comp_rules", { applies_to: kind }, { order: "version", desc: true });
    const nowS = nowIso(this.now());
    const r = rules.find((x) => x.effective_from <= nowS) ?? rules[0];
    if (!r) throw new VoicesError(503, "comp_rule_missing", "No creator compensation rule.");
    return r;
  }
  async permissions(voice: T.VoiceRow, version = voice.current_permission_version): Promise<T.PermissionRow> {
    const p = await this.repo.one("voice_permission_versions", { voice_id: voice.id, version });
    if (!p) throw new VoicesError(500, "permissions_missing", "Voice permissions missing.");
    return p;
  }

  // ------------------------------------------------------------ catalog
  publicVoice(v: T.VoiceRow) {
    const { provider_voice_ref: _ref, provider: _p, model_version: _m, ...rest } = v;
    void _ref; void _p; void _m;
    return { ...rest, earned_verification: v.verification_status === "provider_verified" || v.verification_status === "manual_verified" ? v.verification_status : null };
  }

  async catalog(f: { q?: string; language?: string; dialect?: string; tone?: string; use?: string; maxIxis60s?: number } = {}) {
    const [voices, creators, cfg] = await Promise.all([this.repo.find("voices", { status: "active" }), this.repo.find("voice_creators", { status: "active" }), this.pricing()]);
    const byId = new Map(creators.map((c) => [c.id, c]));
    const q = f.q?.normalize("NFC").toLowerCase().trim();
    const out = [];
    for (const v of voices) {
      const c = byId.get(v.creator_id);
      if (!c) continue;
      if (f.language && !v.languages.includes(f.language)) continue;
      if (f.dialect && !v.dialects.includes(f.dialect)) continue;
      if (f.tone && !v.tones.includes(f.tone)) continue;
      if (f.use && !v.use_categories.includes(f.use)) continue;
      if (f.maxIxis60s !== undefined && cfg.payg_base_ixis > f.maxIxis60s) continue;
      if (q) {
        const hay = [v.display_name, v.display_name_ar, v.description, v.description_ar, c.display_name, c.display_name_ar, ...v.tones, ...v.dialects, ...v.use_categories].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) continue;
      }
      const perm = await this.permissions(v);
      out.push({ voice: this.publicVoice(v), creator: publicCreator(c), permissions: publicPermissions(perm), fromIxis: cfg.payg_base_ixis, illustrative: cfg.illustrative });
    }
    return out.sort((a, b) => a.voice.display_name.localeCompare(b.voice.display_name));
  }

  /** Cixy / partner read-only recommendation: ranks active voices by tag overlap. No PII, no refs. */
  async recommend(input: { text?: string; language?: string; dialect?: string; use?: string; tone?: string; limit?: number }) {
    const all = (await this.catalog({ language: input.language })).filter((e) => e.permissions.assistant_use); // creator opted in
    const words = (input.text ?? "").toLowerCase().split(/[^\p{L}\p{N}-]+/u).filter(Boolean);
    const scored = all.map((e) => {
      let s = 0;
      if (input.dialect && e.voice.dialects.includes(input.dialect)) s += 5;
      if (input.use && e.voice.use_categories.includes(input.use)) s += 3;
      if (input.tone && e.voice.tones.includes(input.tone)) s += 2;
      for (const w of words) if ([...e.voice.tones, ...e.voice.use_categories, ...e.voice.dialects].some((t) => t.includes(w))) s += 1;
      return { score: s, slug: e.voice.slug, name: e.voice.display_name, name_ar: e.voice.display_name_ar, dialects: e.voice.dialects, tones: e.voice.tones, uses: e.voice.use_categories, from_ixis: e.fromIxis, is_demo: e.voice.is_demo, url: `/voices/${e.voice.slug}` };
    });
    const any = !!(input.dialect || input.use || input.tone || words.length);
    return scored.filter((s) => s.score > 0 || !any).sort((a, b) => b.score - a.score).slice(0, Math.min(input.limit ?? 5, 10));
  }

  async voiceBySlug(slug: string, actor: Actor | null) {
    const v = await this.repo.one("voices", { slug });
    if (!v) throw notFound("Voice");
    const c = await this.repo.one("voice_creators", { id: v.creator_id });
    if (!c) throw notFound("Creator");
    const own = !!actor && c.user_id === actor.userId;
    if ((v.status !== "active" || c.status !== "active") && !own && !this.isAdmin(actor)) throw notFound("Voice");
    const [perm, samples, cfg] = await Promise.all([
      this.permissions(v),
      this.repo.find("voice_samples", { voice_id: v.id }, { order: "created_at" }),
      this.pricing(),
    ]);
    const visible = samples.filter((s) => (s.creator_approved && s.admin_approved) || own || this.isAdmin(actor));
    const sampleUrls = await Promise.all(visible.map(async (s) => ({ id: s.id, title: s.title, language: s.language, dialect: s.dialect, transcript: s.transcript, is_demo: s.is_demo, approved: s.creator_approved && s.admin_approved, url: perm.sample_playback || own ? await this.repo.signedUrl(s.storage_bucket, s.storage_path, SIGNED_URL_TTL_SECONDS) : null })));
    return { voice: this.publicVoice(v), creator: publicCreator(c), permissions: publicPermissions(perm), samples: sampleUrls, pricing: cfg, own };
  }

  async storefront(handle: string) {
    const c = await this.repo.one("voice_creators", { handle, status: "active" });
    if (!c) throw notFound("Creator");
    const voices = (await this.repo.find("voices", { creator_id: c.id, status: "active" })).map((v) => this.publicVoice(v));
    return { creator: publicCreator(c), voices };
  }

  // ------------------------------------------------------------ creator onboarding
  async myCreator(actor: Actor): Promise<T.CreatorRow | null> {
    return this.repo.one("voice_creators", { user_id: actor.userId });
  }
  async requireCreator(actor: Actor): Promise<T.CreatorRow> {
    const c = await this.myCreator(actor);
    if (!c) throw deny("not_creator", "Create your creator profile first.");
    if (c.status !== "active") throw deny("creator_suspended", "Your creator profile is suspended.");
    return c;
  }
  async ownVoice(actor: Actor, voiceId: string): Promise<{ creator: T.CreatorRow; voice: T.VoiceRow }> {
    const creator = await this.requireCreator(actor);
    const voice = await this.repo.one("voices", { id: voiceId });
    if (!voice || voice.creator_id !== creator.id) throw notFound("Voice");
    return { creator, voice };
  }

  async becomeCreator(actorIn: Actor, input: { handle: string; display_name: string; display_name_ar?: string | null; bio?: string | null; bio_ar?: string | null; adult: boolean; accept_creator_terms: boolean; hire_enabled?: boolean }, ip?: string) {
    const actor = await this.requireAccess(actorIn);
    if (!input.adult) throw bad("adults_only", "Lyrixis Voices creators must be 18 or older.");
    if (!input.accept_creator_terms) throw bad("terms_required", "Accept the creator terms to continue.");
    if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(input.handle)) throw bad("bad_handle", "Handle: 3–40 lowercase letters, numbers or dashes.");
    assertAllowedName(input.display_name);
    if (input.display_name_ar) assertAllowedName(input.display_name_ar);
    if (await this.myCreator(actor)) throw conflict("already_creator", "You already have a creator profile.");
    const others = await this.repo.find("voice_creators", {});
    if (others.some((o) => similarName(o.display_name, input.display_name))) throw bad("name_taken", "Another creator already uses that display name.");
    let creator: T.CreatorRow;
    try {
      creator = await this.repo.insert("voice_creators", {
        user_id: actor.userId, handle: input.handle, display_name: input.display_name.trim(), display_name_ar: input.display_name_ar?.trim() || null,
        bio: input.bio ?? null, bio_ar: input.bio_ar ?? null, adult_attested_at: nowIso(this.now()), identity_check_status: "not_started",
        payout_status: "blocked_no_payout_rail", wallet_owner: actor.walletOwner, status: "active", hire_enabled: !!input.hire_enabled, is_demo: this.mode === "demo",
      });
    } catch (e) {
      if (e instanceof ConflictError) throw conflict("handle_taken", "That handle is taken.");
      throw e;
    }
    const ipHash = ip ? sha256(`voices:${ip}`).slice(0, 32) : null;
    await this.repo.insert("voice_consents", { creator_id: creator.id, voice_id: null, kind: "adult_attestation", terms_version: TERMS.creator_terms, text_hash: sha256("I am 18 or older."), ip_hash: ipHash });
    await this.repo.insert("voice_consents", { creator_id: creator.id, voice_id: null, kind: "creator_terms", terms_version: TERMS.creator_terms, text_hash: sha256(CREATOR_TERMS_TEXT), ip_hash: ipHash });
    await this.audit(actor, "consent", "creator_terms_accepted", "voice_creator", creator.id, { terms_version: TERMS.creator_terms });
    return creator;
  }

  async createVoiceDraft(actor: Actor, input: { slug: string; display_name: string; display_name_ar?: string | null; description?: string | null; description_ar?: string | null; languages: string[]; dialects: string[]; tones: string[]; use_categories: string[]; licensing_mode: T.LicensingMode }) {
    const creator = await this.requireCreator(await this.requireAccess(actor));
    assertAllowedName(input.display_name);
    if (input.display_name_ar) assertAllowedName(input.display_name_ar);
    if (!/^[a-z0-9][a-z0-9-]{2,60}$/.test(input.slug)) throw bad("bad_slug", "Voice URL: 3–60 lowercase letters, numbers or dashes.");
    if (!input.languages.length || !input.dialects.length) throw bad("dialect_required", "Pick at least one language and one explicit dialect.");
    if (input.languages.includes("ar") && !input.dialects.some((d) => d.startsWith("ar-"))) throw bad("dialect_required", "Arabic voices must name a dialect (e.g. Gulf — Saudi, Egyptian, MSA).");
    const provider = this.mode === "demo" ? "demo" : process.env.ELEVENLABS_API_KEY ? "elevenlabs" : null;
    let voice: T.VoiceRow;
    try {
      voice = await this.repo.insert("voices", {
        slug: input.slug, creator_id: creator.id, display_name: input.display_name.trim(), display_name_ar: input.display_name_ar ?? null,
        description: input.description ?? null, description_ar: input.description_ar ?? null, languages: input.languages, dialects: input.dialects,
        tones: input.tones, use_categories: input.use_categories, status: "draft", status_reason: null, verification_status: "unverified",
        dialect_review_status: "pending", licensing_mode: input.licensing_mode, current_permission_version: 1, model_version: null,
        provider, provider_voice_ref: this.mode === "demo" ? `demo:${input.slug}` : null, is_demo: this.mode === "demo", submitted_at: null, approved_at: null,
      });
    } catch (e) {
      if (e instanceof ConflictError) throw conflict("slug_taken", "That voice URL is taken.");
      throw e;
    }
    await this.repo.insert("voice_permission_versions", { ...DEFAULT_PERMISSIONS, voice_id: voice.id, version: 1 });
    await this.audit(actor, "permission", "voice_draft_created", "voice", voice.id, { licensing_mode: input.licensing_mode });
    return voice;
  }

  async setPermissions(actor: Actor, voiceId: string, patch: Partial<Omit<T.PermissionRow, "voice_id" | "version" | "created_at">>, licensingMode?: T.LicensingMode) {
    const { voice } = await this.ownVoice(actor, voiceId);
    const cur = await this.permissions(voice);
    const blocked = Array.from(new Set([...(patch.blocked_uses ?? cur.blocked_uses), ...ALWAYS_BLOCKED_USES]));
    const allowed = (patch.allowed_uses ?? cur.allowed_uses).filter((u) => !blocked.includes(u));
    const version = cur.version + 1;
    const { created_at: _c, ...curRest } = cur; void _c;
    await this.repo.insert("voice_permission_versions", { ...curRest, ...patch, allowed_uses: allowed, blocked_uses: blocked, voice_id: voice.id, version });
    await this.repo.update("voices", { id: voice.id }, { current_permission_version: version, ...(licensingMode ? { licensing_mode: licensingMode } : {}) });
    await this.audit(actor, "permission", "permissions_updated", "voice", voice.id, { version, licensing_mode: licensingMode ?? voice.licensing_mode });
    return version;
  }

  async uploadSample(actor: Actor, voiceId: string, input: { title: string; language: string; dialect?: string | null; transcript?: string | null; mime: string; body: Uint8Array }) {
    const { voice } = await this.ownVoice(actor, voiceId);
    const { mime } = validateUpload("sample", input.mime, input.body);
    const path = `${voice.id}/${randomBytes(8).toString("hex")}`;
    await this.repo.putObject("voices-public-samples", path, input.body, mime);
    const row = await this.repo.insert("voice_samples", { voice_id: voice.id, title: input.title.slice(0, 120), language: input.language, dialect: input.dialect ?? null, transcript: input.transcript ?? null, storage_bucket: "voices-public-samples", storage_path: path, mime_type: mime, bytes: input.body.byteLength, creator_approved: true, admin_approved: false, is_demo: this.mode === "demo" });
    await this.audit(actor, "data", "sample_uploaded", "voice_sample", row.id, { bytes: input.body.byteLength });
    return row;
  }

  /** Private training audio. Validated, never published, deleted after retention. Not verification. */
  async uploadTraining(actor: Actor, voiceId: string, input: { mime: string; body: Uint8Array; duration_seconds?: number | null }) {
    const { voice, creator } = await this.ownVoice(actor, voiceId);
    const { mime } = validateUpload("training", input.mime, input.body);
    const seconds = wavSeconds(input.body) ?? input.duration_seconds ?? null;
    const notes: string[] = [];
    if (input.body.byteLength < 32_000) notes.push("File is very short; record at least 30 seconds per file.");
    if (seconds !== null && seconds < 10) notes.push("Under 10 seconds.");
    const path = `${creator.id}/${voice.id}/${randomBytes(8).toString("hex")}`;
    await this.repo.putObject("voices-training-private", path, input.body, mime);
    const del = new Date(this.now().getTime() + TRAINING_RETENTION_DAYS * 86_400_000);
    const row = await this.repo.insert("voice_training_uploads", { voice_id: voice.id, creator_id: creator.id, storage_bucket: "voices-training-private", storage_path: path, mime_type: mime, bytes: input.body.byteLength, duration_seconds: seconds === null ? null : Math.round(seconds), validation_status: notes.length ? "failed" : "passed", validation_notes: notes.join(" ") || null, delete_after: nowIso(del), deleted_at: null });
    await this.audit(actor, "data", "training_uploaded", "voice_training_upload", row.id, { bytes: input.body.byteLength, passed: !notes.length });
    return row;
  }

  async giveCloningConsent(actor: Actor, voiceId: string, input: { accept: boolean; typed_name: string }, ip?: string) {
    const { voice, creator } = await this.ownVoice(actor, voiceId);
    if (!input.accept) throw bad("consent_required", "Cloning consent must be given explicitly.");
    if (!similarName(input.typed_name, creator.display_name) && !(creator.display_name_ar && similarName(input.typed_name, creator.display_name_ar))) {
      throw bad("consent_name", "Type your creator display name exactly to sign.");
    }
    const row = await this.repo.insert("voice_consents", { creator_id: creator.id, voice_id: voice.id, kind: "cloning", terms_version: TERMS.cloning_consent, text_hash: sha256(CLONING_CONSENT_TEXT), ip_hash: ip ? sha256(`voices:${ip}`).slice(0, 32) : null });
    await this.audit(actor, "consent", "cloning_consent_given", "voice", voice.id, { terms_version: TERMS.cloning_consent });
    return row;
  }

  async revokeCloningConsent(actor: Actor, voiceId: string, reason: string) {
    const { voice } = await this.ownVoice(actor, voiceId);
    const rows = await this.repo.find("voice_consents", { voice_id: voice.id, kind: "cloning" });
    for (const r of rows.filter((x) => !x.revoked_at)) await this.repo.update("voice_consents", { id: r.id }, { revoked_at: nowIso(this.now()), revoke_reason: reason.slice(0, 200) });
    await this.setStatus(actor, voice, "retired", "Cloning consent revoked by creator");
    await this.audit(actor, "consent", "cloning_consent_revoked", "voice", voice.id);
  }

  async hasCloningConsent(voiceId: string): Promise<boolean> {
    const rows = await this.repo.find("voice_consents", { voice_id: voiceId, kind: "cloning" });
    return rows.some((r) => !r.revoked_at);
  }

  /**
   * Submit for review. Upload alone is NOT verification: we try provider voice verification
   * (ElevenLabs PVC CAPTCHA, read by the creator) and fall back to the admin review queue.
   */
  async submitForReview(actor: Actor, voiceId: string) {
    const { voice, creator } = await this.ownVoice(actor, voiceId);
    if (!["draft", "verification_pending", "review_pending"].includes(voice.status)) throw conflict("bad_state", `Voice is ${voice.status}.`);
    if (!creator.adult_attested_at) throw bad("adults_only", "Adult attestation missing.");
    if (!(await this.hasCloningConsent(voice.id))) throw bad("consent_required", "Give cloning consent first.");
    const samples = await this.repo.find("voice_samples", { voice_id: voice.id });
    if (!samples.length) throw bad("sample_required", "Upload at least one public sample.");
    const training = await this.repo.find("voice_training_uploads", { voice_id: voice.id, validation_status: "passed" });
    if (!training.length) throw bad("training_required", "Upload at least one training file that passes validation.");
    const provider = providerFor(voice.provider, this.providers);
    let verification: Awaited<ReturnType<NonNullable<VoiceProvider["startVerification"]>>> | null = null;
    if (provider && provider.configured() && !provider.isDemo && voice.provider_voice_ref && provider.startVerification) {
      try { verification = await provider.startVerification(voice.provider_voice_ref); } catch (e) { verification = { method: "manual_only", reason: `Provider verification unavailable: ${safeError(e)}` }; }
    }
    const providerCaptcha = verification?.method === "captcha";
    await this.repo.update("voices", { id: voice.id }, { status: providerCaptcha ? "verification_pending" : "review_pending", verification_status: "pending", submitted_at: nowIso(this.now()) });
    await this.repo.insert("voice_verifications", { voice_id: voice.id, method: providerCaptcha ? "provider" : "manual", status: "pending", provider: voice.provider, reviewer_user_id: null, notes: providerCaptcha ? "Awaiting creator CAPTCHA recording" : verification?.method === "manual_only" ? verification.reason : "Manual review queue (no provider verification available)" });
    await this.audit(actor, "admin", "voice_submitted", "voice", voice.id, { method: providerCaptcha ? "provider" : "manual" });
    return { status: providerCaptcha ? "verification_pending" : "review_pending", verification };
  }

  async submitProviderVerification(actor: Actor, voiceId: string, recording: { mime: string; body: Uint8Array }) {
    const { voice } = await this.ownVoice(actor, voiceId);
    const provider = providerFor(voice.provider, this.providers);
    if (!provider?.submitVerification || !voice.provider_voice_ref) throw bad("no_provider_verification", "This voice uses the admin review queue.");
    validateUpload("training", recording.mime, recording.body);
    let result: { status: "passed" | "failed" | "pending"; detail?: string };
    try { result = await provider.submitVerification(voice.provider_voice_ref, recording); } catch (e) { result = { status: "failed", detail: safeError(e) }; }
    await this.repo.insert("voice_verifications", { voice_id: voice.id, method: "provider", status: result.status, provider: provider.id, reviewer_user_id: null, notes: result.detail ?? null });
    if (result.status === "passed") await this.repo.update("voices", { id: voice.id }, { verification_status: "provider_verified", status: "review_pending" });
    else if (result.status === "failed") await this.repo.update("voices", { id: voice.id }, { status: "review_pending" }); // fall back to the admin queue
    await this.audit(actor, "admin", "provider_verification", "voice", voice.id, { status: result.status });
    return result;
  }

  async setStatus(actor: Actor | null, voice: T.VoiceRow, status: T.VoiceStatus, reason: string | null) {
    await this.repo.update("voices", { id: voice.id }, { status, status_reason: reason });
    if (status === "paused" || status === "suspended" || status === "retired") await this.stopUnfulfilled(voice.id, `voice_${status}`);
    if (status === "retired") await this.deleteTraining(voice.id);
    await this.audit(actor, "admin", `voice_${status}`, "voice", voice.id, { reason });
  }

  /** Delete private training audio for a voice (on retire) — keeps the row as an audit stub. */
  private async deleteTraining(voiceId: string) {
    for (const t of await this.repo.find("voice_training_uploads", { voice_id: voiceId })) {
      if (t.deleted_at) continue;
      await this.repo.deleteObject(t.storage_bucket, t.storage_path).catch(() => undefined);
      await this.repo.update("voice_training_uploads", { id: t.id }, { deleted_at: nowIso(this.now()) });
    }
  }

  /** Retention sweep (cron): training audio past delete_after, script text past delete_after (hash kept). */
  async purgeExpired() {
    const now = nowIso(this.now());
    let training = 0; let scripts = 0;
    for (const t of await this.repo.find("voice_training_uploads", { delete_after: { lte: now } })) {
      if (t.deleted_at) continue;
      await this.repo.deleteObject(t.storage_bucket, t.storage_path).catch(() => undefined);
      await this.repo.update("voice_training_uploads", { id: t.id }, { deleted_at: now }); training++;
    }
    for (const sc of await this.repo.find("voice_scripts", { delete_after: { lte: now } })) {
      if (sc.body === "") continue;
      await this.repo.update("voice_scripts", { id: sc.id }, { body: "" }); scripts++;
    }
    return { training, scripts };
  }

  async creatorPause(actor: Actor, voiceId: string) { const { voice } = await this.ownVoice(actor, voiceId); if (voice.status !== "active") throw conflict("bad_state", "Only active voices can be paused."); await this.setStatus(actor, voice, "paused", "Paused by creator"); }
  async creatorResume(actor: Actor, voiceId: string) { const { voice } = await this.ownVoice(actor, voiceId); if (voice.status !== "paused") throw conflict("bad_state", "Only paused voices can be resumed."); await this.setStatus(actor, voice, "active", null); }
  async creatorRetire(actor: Actor, voiceId: string) { const { voice } = await this.ownVoice(actor, voiceId); if (voice.status === "retired") return; await this.setStatus(actor, voice, "retired", "Retired by creator"); }

  // ------------------------------------------------------------ admin
  async adminQueue(actor: Actor) {
    this.requireAdmin(actor);
    const voices = await this.repo.find("voices", { status: { in: ["verification_pending", "review_pending"] } }, { order: "created_at" });
    const dialect = await this.repo.find("voices", { dialect_review_status: "pending", status: { in: ["review_pending", "active"] } });
    const samples = await this.repo.find("voice_samples", { admin_approved: false });
    const reports = await this.repo.find("voice_reports", { status: "open" }, { order: "created_at", desc: true });
    const all = await this.repo.find("voices", {}, { order: "created_at" });
    return { voices: voices.map((v) => this.publicVoice(v)), dialect: dialect.map((v) => this.publicVoice(v)), samples, reports, all: all.map((v) => this.publicVoice(v)) };
  }

  private async adminVoice(actorIn: Actor, voiceId: string) {
    const actor = this.requireAdmin(actorIn);
    const voice = await this.repo.one("voices", { id: voiceId });
    if (!voice) throw notFound("Voice");
    return { actor, voice };
  }

  async adminManualVerify(actorIn: Actor, voiceId: string, passed: boolean, notes: string) {
    const { actor, voice } = await this.adminVoice(actorIn, voiceId);
    await this.repo.insert("voice_verifications", { voice_id: voice.id, method: "manual", status: passed ? "passed" : "failed", provider: null, reviewer_user_id: actor.userId, notes: notes.slice(0, 1000) });
    await this.repo.update("voices", { id: voice.id }, { verification_status: passed ? "manual_verified" : "rejected" });
    await this.audit(actor, "admin", "manual_verification", "voice", voice.id, { passed });
  }

  async adminReview(actorIn: Actor, voiceId: string, decision: "approved" | "changes_requested" | "rejected", notes: string) {
    const { actor, voice } = await this.adminVoice(actorIn, voiceId);
    if (decision === "approved") {
      if (!(voice.verification_status === "provider_verified" || voice.verification_status === "manual_verified")) throw bad("not_verified", "Verify ownership (provider or manual) before approving.");
      if (!(await this.hasCloningConsent(voice.id))) throw bad("consent_required", "No active cloning consent.");
      const perm = await this.permissions(voice);
      if ((perm.paid_generation || perm.auditions) && !voice.provider_voice_ref) throw bad("no_provider_voice", "Generation needs a trained provider voice. Disable generation/auditions or finish provider setup.");
    }
    await this.repo.insert("voice_reviews", { voice_id: voice.id, kind: "listing", decision, reviewer_user_id: actor.userId, native_speaker_of: null, notes: notes.slice(0, 2000) });
    if (decision === "approved") await this.repo.update("voices", { id: voice.id }, { status: "active", approved_at: nowIso(this.now()), status_reason: null });
    else await this.repo.update("voices", { id: voice.id }, { status: "draft", status_reason: notes.slice(0, 300) });
    await this.audit(actor, "admin", `review_${decision}`, "voice", voice.id);
  }

  async adminDialectReview(actorIn: Actor, voiceId: string, decision: "approved" | "changes_requested", nativeSpeakerOf: string, notes: string) {
    const { actor, voice } = await this.adminVoice(actorIn, voiceId);
    if (!nativeSpeakerOf) throw bad("native_speaker_required", "Dialect reviews must name the reviewer's native dialect.");
    await this.repo.insert("voice_reviews", { voice_id: voice.id, kind: "dialect", decision, reviewer_user_id: actor.userId, native_speaker_of: nativeSpeakerOf, notes: notes.slice(0, 2000) });
    await this.repo.update("voices", { id: voice.id }, { dialect_review_status: decision });
    await this.audit(actor, "admin", "dialect_review", "voice", voice.id, { decision, native_speaker_of: nativeSpeakerOf });
  }

  async adminApproveSample(actorIn: Actor, sampleId: string, approve: boolean) {
    const actor = this.requireAdmin(actorIn);
    await this.repo.update("voice_samples", { id: sampleId }, { admin_approved: approve });
    await this.audit(actor, "admin", approve ? "sample_approved" : "sample_unapproved", "voice_sample", sampleId);
  }

  async adminSuspend(actorIn: Actor, voiceId: string, reason: string) {
    const { actor, voice } = await this.adminVoice(actorIn, voiceId);
    await this.setStatus(actor, voice, "suspended", reason.slice(0, 300));
  }
  async adminReinstate(actorIn: Actor, voiceId: string) {
    const { actor, voice } = await this.adminVoice(actorIn, voiceId);
    await this.setStatus(actor, voice, "active", null);
  }

  /**
   * Link a provider voice the creator made in THEIR OWN provider account and shared with Lyrixis
   * (ElevenLabs only allows PVC of your own voice). Checks the provider can see it. Not for demo.
   */
  async adminLinkProviderVoice(actorIn: Actor, voiceId: string, providerId: string, ref: string) {
    const { actor, voice } = await this.adminVoice(actorIn, voiceId);
    if (voice.status === "active") throw conflict("bad_state", "Pause the voice before changing its provider voice.");
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(ref)) throw bad("bad_ref", "Provider voice id looks wrong.");
    const provider = providerFor(providerId, this.providers);
    if (!provider || provider.isDemo || !provider.configured()) throw new VoicesError(503, "provider_unavailable", `${providerId} is not configured (set its API key).`);
    if (provider.trainingState) {
      const st = await provider.trainingState(ref).catch(() => null);
      if (!st) throw bad("ref_not_found", "The provider can't see that voice from the Lyrixis account.");
    }
    await this.repo.update("voices", { id: voice.id }, { provider: provider.id, provider_voice_ref: ref, model_version: `${provider.id}:${ref.slice(0, 6)}` });
    await this.audit(actor, "admin", "provider_voice_linked", "voice", voice.id, { provider: provider.id });
  }

  async adminSetPricing(actorIn: Actor, input: Omit<T.PricingConfigRow, "version" | "active" | "created_at">) {
    const actor = this.requireAdmin(actorIn);
    const cur = await this.pricing();
    for (const k of ["payg_base_ixis", "payg_base_seconds", "payg_step_ixis", "payg_step_seconds", "payg_max_seconds", "audition_max_seconds"] as const) if (!(Number.isInteger(input[k]) && input[k] > 0)) throw bad("bad_pricing", `${k} must be a positive whole number`);
    await this.repo.update("voice_pricing_configs", { version: cur.version }, { active: false });
    await this.repo.insert("voice_pricing_configs", { ...input, version: cur.version + 1, active: true });
    await this.audit(actor, "admin", "pricing_updated", "voice_pricing_config", String(cur.version + 1), { payg_base_ixis: input.payg_base_ixis, illustrative: input.illustrative });
    return cur.version + 1;
  }

  async adminInvite(actorIn: Actor, email: string, role: T.InviteRow["role"], note?: string) {
    const actor = this.requireAdmin(actorIn);
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw bad("bad_email", "Enter a valid email.");
    const existing = await this.repo.one("voice_invites", { email: e });
    if (existing) await this.repo.update("voice_invites", { email: e }, { revoked_at: null, role });
    else await this.repo.insert("voice_invites", { email: e, role, invited_by: actor.userId, note: note ?? null, revoked_at: null });
    await this.audit(actor, "admin", "invite_added", "voice_invite", null, { role });
  }

  /** Manual / admin-assisted allowance (until Wallet subscription SKUs exist). Labeled in the ledger. */
  async adminGrantAllowance(actorIn: Actor, workspaceId: string, units: number, packageId: string, note: string) {
    const actor = this.requireAdmin(actorIn);
    const ws = await this.repo.one("voice_workspaces", { id: workspaceId });
    if (!ws) throw notFound("Workspace");
    const pkg = await this.repo.one("voice_packages", { id: packageId });
    if (!pkg) throw notFound("Package");
    if (!Number.isInteger(units) || units <= 0 || units > pkg.voiceovers_per_month * 2) throw bad("bad_units", "Allowance must be a positive, bounded number (never unlimited).");
    const key = `topup:${workspaceId}:${randomBytes(6).toString("hex")}`;
    await this.repo.postLedger(allowanceTopupTx({ key, workspaceId, valueIxis: units * allowanceUnitValue(pkg), source: "admin_grant" }));
    await this.repo.restoreAllowance(workspaceId, units);
    await this.repo.update("voice_workspaces", { id: workspaceId }, { package_id: pkg.id, seats_limit: Math.max(ws.seats_limit, pkg.seats) });
    await this.audit(actor, "payment", "allowance_granted_manual", "voice_workspace", workspaceId, { units, package: pkg.id, note });
  }

  async report(actorIn: Actor | null, voiceId: string, reason: T.ReportRow["reason"], details: string) {
    const v = await this.repo.one("voices", { id: voiceId });
    if (!v) throw notFound("Voice");
    const r = await this.repo.insert("voice_reports", { voice_id: voiceId, reporter_user_id: actorIn?.userId ?? null, reason, details: details.slice(0, 4000), status: "open" });
    await this.audit(actorIn, "security", "voice_reported", "voice", voiceId, { reason });
    return r;
  }
  async adminResolveReport(actorIn: Actor, reportId: string, action: "actioned" | "dismissed", suspend: boolean) {
    const actor = this.requireAdmin(actorIn);
    const r = await this.repo.one("voice_reports", { id: reportId });
    if (!r) throw notFound("Report");
    await this.repo.update("voice_reports", { id: reportId }, { status: action });
    if (suspend) await this.adminSuspend(actor, r.voice_id, `Report: ${r.reason}`);
    await this.audit(actor, "admin", `report_${action}`, "voice_report", reportId, { suspend });
  }

  // ------------------------------------------------------------ workspaces (tenant isolation)
  async ensureWorkspace(actor: Actor, name?: string): Promise<T.WorkspaceRow> {
    const mems = await this.repo.find("voice_workspace_members", { user_id: actor.userId });
    if (mems.length) {
      const ws = await this.repo.one("voice_workspaces", { id: mems[0].workspace_id });
      if (ws) return ws;
    }
    const ws = await this.repo.insert("voice_workspaces", { name: name ?? "My workspace", brand_name: null, owner_user_id: actor.userId, preferred_voice_id: null, package_id: null, allowance_voiceovers: 0, allowance_period_end: null, seats_limit: 1, credit_ixis: 0, monthly_spend_cap_ixis: null, socixis_org_id: null, is_demo: this.mode === "demo" });
    await this.repo.insert("voice_workspace_members", { workspace_id: ws.id, user_id: actor.userId, role: "owner" });
    return ws;
  }

  async requireMember(actor: Actor, workspaceId: string, roles: T.MemberRow["role"][] = ["owner", "admin", "editor", "viewer"]): Promise<{ ws: T.WorkspaceRow; role: T.MemberRow["role"] }> {
    const m = await this.repo.one("voice_workspace_members", { workspace_id: workspaceId, user_id: actor.userId });
    if (!m) throw notFound("Workspace"); // 404, not 403: never leak another tenant's existence
    if (!roles.includes(m.role)) throw deny("role", `Needs role: ${roles.join(" or ")}.`);
    const ws = await this.repo.one("voice_workspaces", { id: workspaceId });
    if (!ws) throw notFound("Workspace");
    return { ws, role: m.role };
  }

  async updateWorkspace(actor: Actor, workspaceId: string, patch: { name?: string; brand_name?: string | null; monthly_spend_cap_ixis?: number | null; preferred_voice_id?: string | null }) {
    await this.requireMember(actor, workspaceId, ["owner", "admin"]);
    if (patch.preferred_voice_id) {
      const v = await this.repo.one("voices", { id: patch.preferred_voice_id, status: "active" });
      if (!v) throw bad("voice_unavailable", "Brand voice must be an active voice. (A brand voice is a preference, not exclusivity.)");
    }
    if (patch.monthly_spend_cap_ixis != null && (!Number.isInteger(patch.monthly_spend_cap_ixis) || patch.monthly_spend_cap_ixis < 0)) throw bad("bad_cap", "Spend cap must be a whole number of Ixis.");
    await this.repo.update("voice_workspaces", { id: workspaceId }, patch);
    await this.audit(actor, "permission", "workspace_updated", "voice_workspace", workspaceId, { cap: patch.monthly_spend_cap_ixis ?? null });
  }

  async addMember(actor: Actor, workspaceId: string, userId: string, role: T.MemberRow["role"]) {
    const { ws } = await this.requireMember(actor, workspaceId, ["owner", "admin"]);
    if (role === "owner") throw bad("bad_role", "There is one owner.");
    const members = await this.repo.find("voice_workspace_members", { workspace_id: workspaceId });
    if (members.length >= ws.seats_limit) throw deny("seats_full", `This workspace has ${ws.seats_limit} seat(s).`);
    await this.repo.insert("voice_workspace_members", { workspace_id: workspaceId, user_id: userId, role });
    await this.audit(actor, "permission", "member_added", "voice_workspace", workspaceId, { role });
  }

  async createProject(actor: Actor, workspaceId: string, name: string) {
    await this.requireMember(actor, workspaceId, ["owner", "admin", "editor"]);
    return this.repo.insert("voice_projects", { workspace_id: workspaceId, name: name.slice(0, 120) || "Untitled", created_by: actor.userId });
  }

  async addPronunciation(actor: Actor, workspaceId: string, term: string, sayAs: string, language: string) {
    await this.requireMember(actor, workspaceId, ["owner", "admin", "editor"]);
    if (!term.trim() || !sayAs.trim()) throw bad("bad_pronunciation", "Term and pronunciation are required.");
    return this.repo.insert("voice_pronunciations", { workspace_id: workspaceId, term: term.normalize("NFC").trim().slice(0, 80), say_as: sayAs.normalize("NFC").trim().slice(0, 160), language });
  }

  async workspaceOverview(actor: Actor, workspaceId: string) {
    const { ws, role } = await this.requireMember(actor, workspaceId);
    const [projects, purchases, pronunciations, members, scripts] = await Promise.all([
      this.repo.find("voice_projects", { workspace_id: ws.id }, { order: "created_at", desc: true }),
      this.repo.find("voice_purchases", { workspace_id: ws.id }, { order: "created_at", desc: true }),
      this.repo.find("voice_pronunciations", { workspace_id: ws.id }),
      this.repo.find("voice_workspace_members", { workspace_id: ws.id }),
      this.repo.find("voice_scripts", { workspace_id: ws.id }, { order: "created_at", desc: true, limit: 50 }),
    ]);
    return { ws, role, projects, purchases, pronunciations, members, scripts, spentThisMonth: await this.monthSpend(ws.id) };
  }

  private async monthSpend(workspaceId: string): Promise<number> {
    const d = this.now();
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
    const ps = await this.repo.find("voice_purchases", { workspace_id: workspaceId, status: { in: ["payment_held", "fulfilled"] }, created_at: { gte: start } });
    return ps.filter((p) => p.funding === "wallet" || p.funding === "demo").reduce((s, p) => s + p.price_ixis, 0);
  }

  // ------------------------------------------------------------ auditions
  async audition(actorIn: Actor, workspaceId: string, voiceId: string, textIn: string) {
    const actor = await this.requireAccess(actorIn);
    const { ws } = await this.requireMember(actor, workspaceId, ["owner", "admin", "editor"]);
    const voice = await this.repo.one("voices", { id: voiceId });
    if (!voice || voice.status !== "active") throw deny("voice_unavailable", "This voice is not available for auditions.");
    const perm = await this.permissions(voice);
    if (!perm.auditions) throw deny("auditions_disabled", "The creator has not enabled auditions for this voice.");
    const cfg = await this.pricing();
    const text = normalizeScript(textIn);
    const chars = Array.from(text).length;
    if (!chars) throw bad("empty_script", "Type a short line to audition.");
    if (chars > AUDITION_MAX_CHARS || estimateSeconds(text) > cfg.audition_max_seconds) throw bad("audition_too_long", `Auditions are up to ${cfg.audition_max_seconds} seconds.`);
    const nowMs = this.now().getTime();
    const hits = (this.auditionHits.get(actor.userId) ?? []).filter((t) => nowMs - t < 3_600_000);
    if (hits.length >= AUDITION_LIMIT_PER_HOUR) throw new VoicesError(429, "rate_limited", "Too many auditions. Try again later.");
    hits.push(nowMs); this.auditionHits.set(actor.userId, hits);
    const d = this.now();
    const dayStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
    const today = await this.repo.find("voice_auditions", { created_at: { gte: dayStart } });
    if (today.reduce((s, a) => s + Number(a.provider_cost_usd_micros), 0) >= AUDITION_DAILY_BUDGET_USD_MICROS) throw new VoicesError(503, "audition_budget", "Auditions are paused for today (budget cap). Try tomorrow.");
    const wsToday = today.filter((a) => a.workspace_id === ws.id).length;
    const free = wsToday < cfg.free_auditions_per_day;
    const provider = providerFor(voice.provider, this.providers);
    if (!provider || !provider.configured() || !voice.provider_voice_ref) throw new VoicesError(503, "provider_unavailable", "Auditions are unavailable for this voice right now.");
    const ref = voice.provider_voice_ref;
    const synth = () => this.withTimeout((signal) => provider.synthesize({ providerVoiceRef: ref, text, language: voice.languages[0] ?? "ar", dialect: voice.dialects[0], modelVersion: voice.model_version, signal }), 20_000);
    let result: Awaited<ReturnType<typeof synth>>; let charged = 0; let receipt: string | null = null;
    if (free) {
      result = await synth();
    } else {
      const r = await this.wallet.redeem(actor.walletOwner, WALLET_PRODUCTS.audition, `lyxa-${ws.id.slice(0, 8)}-${randomBytes(6).toString("hex")}`, synth);
      if (!r.ok) throw new VoicesError(402, "insufficient_ixis", `Free auditions used for today. Each extra audition is ${cfg.audition_ixis} Ixis.`, { needed: r.needed });
      result = r.result; charged = cfg.audition_ixis; receipt = r.receiptId;
    }
    const row = await this.repo.insert("voice_auditions", { voice_id: voice.id, user_id: actor.userId, workspace_id: ws.id, chars, provider: provider.id, is_demo: result.isDemo, provider_cost_usd_micros: result.costUsdMicros, charged_ixis: charged, wallet_receipt_id: receipt });
    const path = `auditions/${row.id}`;
    await this.repo.putObject("voices-outputs-private", path, result.audio, result.mime);
    return { auditionId: row.id, url: await this.repo.signedUrl("voices-outputs-private", path, SIGNED_URL_TTL_SECONDS), isDemo: result.isDemo, free, charged, freeLeft: Math.max(0, cfg.free_auditions_per_day - wsToday - 1) };
  }

  // ------------------------------------------------------------ licensing
  /** Checks that apply to every new use. Pausing/suspending a voice makes all of these fail. */
  private async assertUsable(voice: T.VoiceRow | null, req: LicenseRequest | null) {
    if (!voice) throw notFound("Voice");
    if (voice.status !== "active") throw deny("voice_unavailable", "This voice is not available for new licenses right now.");
    const creator = await this.repo.one("voice_creators", { id: voice.creator_id });
    if (!creator || creator.status !== "active") throw deny("voice_unavailable", "This voice is not available.");
    if (!(await this.hasCloningConsent(voice.id))) throw deny("consent_missing", "This voice has no active consent.");
    const perm = await this.permissions(voice);
    if (!perm.paid_generation) throw deny("generation_disabled", "The creator has not enabled paid generation.");
    if (req) {
      const use = req.declared_use;
      if (!use) throw bad("use_required", "Declare how you will use the recording.");
      if ((ALWAYS_BLOCKED_USES as readonly string[]).includes(use) || perm.blocked_uses.includes(use)) throw deny("use_blocked", "That use is not permitted for this voice.");
      if (perm.allowed_uses.length && !perm.allowed_uses.includes(use)) throw deny("use_not_allowed", "The creator has not approved that use.");
      if (req.publication && !perm.publication) throw deny("publication_not_allowed", "This voice is not licensed for publication.");
      const badCh = req.channels.filter((c) => perm.allowed_channels.length && !perm.allowed_channels.includes(c));
      if (badCh.length) throw deny("channel_not_allowed", `Channel not permitted: ${badCh.join(", ")}.`);
      if (!perm.allowed_territories.includes("worldwide") && !perm.allowed_territories.includes(req.territory)) throw deny("territory_not_allowed", "Territory not permitted.");
      if (!(req.term_months >= 1 && req.term_months <= perm.max_term_months)) throw deny("term_too_long", `Max term is ${perm.max_term_months} months.`);
    }
    return { creator, perm };
  }

  async quote(actorIn: Actor, workspaceId: string, voiceId: string, req: LicenseRequest) {
    const actor = await this.requireAccess(actorIn);
    const { ws } = await this.requireMember(actor, workspaceId);
    const voice = await this.repo.one("voices", { id: voiceId });
    const { perm } = await this.assertUsable(voice, req);
    const text = normalizeScript(req.script);
    if (!text) throw bad("empty_script", "Add the script you want recorded.");
    if (Array.from(text).length > SCRIPT_MAX_CHARS) throw bad("script_too_long", `Scripts are up to ${SCRIPT_MAX_CHARS} characters.`);
    const cfg = await this.pricing();
    const seconds = estimateSeconds(text);
    if (seconds > cfg.payg_max_seconds) throw bad("script_too_long", `Up to ${cfg.payg_max_seconds}s per voiceover; split longer scripts.`);
    const billed = billedSeconds(seconds, cfg);
    const price = paygPriceIxis(seconds, cfg);
    const rule = await this.compRule();
    return {
      voice: this.publicVoice(voice!), estimatedSeconds: seconds, billedSeconds: billed, priceIxis: price, usd: ixisToUsd(price), illustrative: cfg.illustrative,
      pricingVersion: cfg.version, allowanceUnits: allowanceUnits(seconds), allowanceAvailable: ws.allowance_voiceovers, creditAvailable: ws.credit_ixis,
      approvalRequired: voice!.licensing_mode === "approval_required", permissionVersion: perm.version,
      creatorShareBps: rule.creator_share_bps, apixisFeeBps: rule.apixis_fee_bps, productKey: walletProductFor(billed),
      spendCap: ws.monthly_spend_cap_ixis, spentThisMonth: await this.monthSpend(ws.id),
    };
  }

  /**
   * Create a purchase with a frozen terms snapshot. Instant voices go straight to payment and
   * generation; approval-required voices wait for the creator (no payment until approved).
   * Idempotent per workspace on idempotencyKey (same key → same purchase, no second charge).
   */
  async purchase(actorIn: Actor, workspaceId: string, voiceId: string, req: LicenseRequest, opts: { funding: "wallet" | "allowance"; idempotencyKey: string; runInline?: boolean }) {
    const actor = await this.requireAccess(actorIn);
    const { ws } = await this.requireMember(actor, workspaceId, ["owner", "admin", "editor"]);
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(opts.idempotencyKey)) throw bad("bad_idempotency_key", "Idempotency key: 8–64 letters, digits, - or _.");
    const idem = `${ws.id}:${opts.idempotencyKey}`;
    const existing = await this.repo.one("voice_purchases", { idempotency_key: idem });
    if (existing) return { purchase: existing, job: await this.repo.one("voice_jobs", { purchase_id: existing.id }), duplicate: true };
    const q = await this.quote(actor, workspaceId, voiceId, req);
    const voice = (await this.repo.one("voices", { id: voiceId }))!;
    const creator = (await this.repo.one("voice_creators", { id: voice.creator_id }))!;
    const rule = await this.compRule();
    const cfg = await this.pricing();
    const consent = (await this.repo.find("voice_consents", { voice_id: voice.id, kind: "cloning" })).find((c) => !c.revoked_at);
    const body = normalizeScript(req.script);
    const script = await this.repo.insert("voice_scripts", { workspace_id: ws.id, project_id: req.project_id ?? null, body, script_hash: scriptHash(body), language: /[\u0600-\u06FF]/.test(body) ? "ar" : "en", created_by: actor.userId, delete_after: new Date(this.now().getTime() + SCRIPT_RETENTION_DAYS * 86_400_000).toISOString() });
    const allowance = opts.funding === "allowance";
    const funding: T.Funding = allowance ? "allowance" : this.wallet.isDemo ? "demo" : "wallet";
    const snapshot: T.TermsSnapshot = {
      snapshot_version: "voices-terms-snapshot/1", license_terms_version: TERMS.license, consent_version: consent?.terms_version ?? null, requires_legal_review: true,
      customer: { workspace_id: ws.id, buyer_user_id: actor.userId, brand_name: ws.brand_name },
      creator: { creator_id: creator.id, display_name: creator.display_name },
      voice: { voice_id: voice.id, slug: voice.slug, display_name: voice.display_name, model_version: voice.model_version, permission_version: voice.current_permission_version },
      script_hash: script.script_hash, script_chars: Array.from(body).length, declared_use: req.declared_use, channels: [...req.channels].sort(), publication: req.publication,
      term_months: req.term_months, territory: req.territory, exclusivity: "non_exclusive",
      price: { ixis: allowance ? 0 : q.priceIxis, usd_equivalent: allowance ? 0 : q.usd, funding, billed_seconds: q.billedSeconds, allowance_units: allowance ? q.allowanceUnits : 0, pricing_version: cfg.version, illustrative: cfg.illustrative },
      creator_compensation: { comp_rule_version: rule.version, creator_share_bps: rule.creator_share_bps, apixis_fee_bps: rule.apixis_fee_bps, share_base: rule.share_base, earnings_hold_days: rule.earnings_hold_days },
      is_demo: this.mode === "demo", created_at: nowIso(this.now()),
    };
    const approval = voice.licensing_mode === "approval_required";
    let purchase: T.PurchaseRow;
    try {
      purchase = await this.repo.insert("voice_purchases", {
        workspace_id: ws.id, buyer_user_id: actor.userId, voice_id: voice.id, creator_id: creator.id, script_id: script.id, kind: "generation",
        status: approval ? "pending_approval" : "awaiting_payment", funding, billed_seconds: q.billedSeconds, allowance_units: snapshot.price.allowance_units,
        price_ixis: snapshot.price.ixis, wallet_product_key: allowance ? null : q.productKey, wallet_reservation_id: null, wallet_receipt_id: null,
        idempotency_key: idem, terms_version: TERMS.license, terms_hash: termsHash(snapshot), terms_snapshot: snapshot, is_demo: this.mode === "demo",
      });
    } catch (e) {
      if (e instanceof ConflictError) { const p = await this.repo.one("voice_purchases", { idempotency_key: idem }); if (p) return { purchase: p, job: null, duplicate: true }; }
      throw e;
    }
    await this.audit(actor, "payment", "purchase_created", "voice_purchase", purchase.id, { price_ixis: purchase.price_ixis, funding, approval });
    if (approval) {
      await this.repo.insert("voice_approval_requests", { purchase_id: purchase.id, voice_id: voice.id, creator_id: creator.id, script_excerpt: body.slice(0, 1200), declared_use: req.declared_use, status: "pending", decided_at: null, decision_note: null });
      return { purchase, job: null, duplicate: false };
    }
    return { ...(await this.payAndQueue(actor, purchase, opts.runInline ?? true)), duplicate: false };
  }

  async decideApproval(actor: Actor, approvalId: string, approve: boolean, note: string) {
    const creator = await this.requireCreator(actor);
    const a = await this.repo.one("voice_approval_requests", { id: approvalId });
    if (!a || a.creator_id !== creator.id) throw notFound("Approval request");
    if (a.status !== "pending") throw conflict("already_decided", "Already decided.");
    await this.repo.update("voice_approval_requests", { id: a.id }, { status: approve ? "approved" : "rejected", decided_at: nowIso(this.now()), decision_note: note.slice(0, 500) });
    await this.repo.update("voice_purchases", { id: a.purchase_id }, { status: approve ? "approved" : "rejected" });
    await this.audit(actor, "permission", approve ? "script_approved" : "script_rejected", "voice_purchase", a.purchase_id);
  }

  /** Customer pays for an approved purchase. Approval-required purchases can't skip this gate. */
  async payApproved(actorIn: Actor, purchaseId: string, runInline = true) {
    const actor = await this.requireAccess(actorIn);
    const p = await this.repo.one("voice_purchases", { id: purchaseId });
    if (!p) throw notFound("Purchase");
    await this.requireMember(actor, p.workspace_id, ["owner", "admin", "editor"]);
    if (p.status === "pending_approval") throw deny("approval_pending", "Waiting for the creator to approve this script.");
    if (p.status !== "approved" && p.status !== "awaiting_payment") throw conflict("bad_state", `Purchase is ${p.status}.`);
    const a = await this.repo.one("voice_approval_requests", { purchase_id: p.id });
    if (a && a.status !== "approved") throw deny("approval_required", "This purchase needs the creator's approval first.");
    const voice = await this.repo.one("voices", { id: p.voice_id });
    if (voice?.licensing_mode === "approval_required" && !a) throw deny("approval_required", "This voice requires the creator's approval first.");
    return this.payAndQueue(actor, p, runInline);
  }

  private async payAndQueue(actor: Actor, p: T.PurchaseRow, runInline: boolean) {
    const voice = await this.repo.one("voices", { id: p.voice_id });
    await this.assertUsable(voice, null);
    const ws = (await this.repo.one("voice_workspaces", { id: p.workspace_id }))!;
    if (p.funding === "allowance") {
      if (!(await this.repo.takeAllowance(ws.id, p.allowance_units))) {
        await this.repo.update("voice_purchases", { id: p.id }, { status: "awaiting_payment" });
        throw new VoicesError(402, "allowance_exhausted", "Not enough voiceovers left in your allowance.", { needed_units: p.allowance_units });
      }
    } else {
      if (ws.monthly_spend_cap_ixis != null && (await this.monthSpend(ws.id)) + p.price_ixis > ws.monthly_spend_cap_ixis) {
        throw deny("spend_cap", "This purchase would exceed your workspace's monthly spend cap.");
      }
      const walletPrice = await this.wallet.price(p.wallet_product_key!);
      if (walletPrice !== p.price_ixis) {
        await this.audit(actor, "payment", "price_mismatch", "voice_purchase", p.id, { wallet: walletPrice, snapshot: p.price_ixis });
        throw new VoicesError(409, "price_mismatch", "The Wallet price for this product doesn't match the quoted price. Nothing was charged.");
      }
      const h = await this.wallet.hold(actor.walletOwner, p.wallet_product_key!, `lyxv-${p.id}`);
      if (!h.ok) {
        await this.repo.update("voice_purchases", { id: p.id }, { status: "awaiting_payment" });
        throw new VoicesError(402, "insufficient_ixis", `Not enough Ixis — this voiceover is ${p.price_ixis.toLocaleString("en-US")} Ixis.`, { needed: h.needed });
      }
      await this.repo.update("voice_purchases", { id: p.id }, { wallet_reservation_id: h.hold.reservationId });
    }
    await this.repo.update("voice_purchases", { id: p.id }, { status: "payment_held" });
    await this.audit(actor, "payment", "payment_held", "voice_purchase", p.id, { funding: p.funding });
    let job = await this.repo.one("voice_jobs", { purchase_id: p.id });
    if (!job) job = await this.repo.insert("voice_jobs", { purchase_id: p.id, workspace_id: p.workspace_id, status: "queued", attempts: 0, max_attempts: 3, timeout_ms: 60_000, lease_until: null, provider: voice!.provider ?? "none", is_demo: !!voice!.is_demo, output_bucket: "voices-outputs-private", output_path: null, output_mime: null, output_seconds: null, chars_billed: null, provider_cost_usd_micros: 0, error_code: null, error_message: null });
    if (runInline) {
      for (let i = 0; i < job.max_attempts; i++) {
        const j = await this.runJob(job.id);
        if (j.status !== "queued") break;
      }
    }
    return { purchase: (await this.repo.one("voice_purchases", { id: p.id }))!, job: (await this.repo.one("voice_jobs", { id: job.id }))! };
  }

  private async withTimeout<R>(fn: (signal: AbortSignal) => Promise<R>, ms: number): Promise<R> {
    const ac = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const t = new Promise<never>((_, rej) => { timer = setTimeout(() => { ac.abort(); rej(new ProviderError("timeout", `Timed out after ${ms}ms`, true)); }, ms); });
    try { return await Promise.race([fn(ac.signal), t]); } finally { if (timer) clearTimeout(timer); }
  }

  /**
   * Run one attempt of a generation job: lease → permission recheck → synthesize (timeout) →
   * store → capture/ledger. Bounded retries; on final failure the Wallet hold is released or the
   * allowance restored, so a failed generation is never charged.
   */
  async runJob(jobId: string): Promise<T.JobRow> {
    const job0 = await this.repo.one("voice_jobs", { id: jobId });
    if (!job0) throw notFound("Job");
    if (!(await this.repo.leaseJob(jobId, job0.timeout_ms + 5000))) return job0;
    const job = (await this.repo.one("voice_jobs", { id: jobId }))!;
    const p = (await this.repo.one("voice_purchases", { id: job.purchase_id }))!;
    const fail = async (status: "failed" | "blocked", code: string, msg: string, purchaseStatus: "failed_released" | "cancelled") => {
      await this.repo.update("voice_jobs", { id: job.id }, { status, error_code: code, error_message: `${msg} Nothing was charged.`, lease_until: null });
      await this.unwindPayment(p, purchaseStatus, code);
      await this.audit(null, "job", `job_${status}`, "voice_job", job.id, { code });
      return (await this.repo.one("voice_jobs", { id: job.id }))!;
    };
    const voice = await this.repo.one("voices", { id: p.voice_id });
    try {
      await this.assertUsable(voice, null); // recheck before every run
    } catch (e) {
      return fail("blocked", e instanceof VoicesError ? e.code : "recheck_failed", "This voice is no longer available.", "cancelled");
    }
    const provider = providerFor(voice!.provider, this.providers);
    if (!provider || !provider.configured() || !voice!.provider_voice_ref) return fail("failed", "provider_unavailable", "The voice provider is not configured.", "failed_released");
    const script = p.script_id ? await this.repo.one("voice_scripts", { id: p.script_id }) : null;
    if (!script) return fail("failed", "script_missing", "Script missing.", "failed_released");
    if (scriptHash(script.body) !== p.terms_snapshot.script_hash) return fail("failed", "script_changed", "Script differs from the licensed script.", "failed_released");
    const prons = await this.repo.find("voice_pronunciations", { workspace_id: p.workspace_id });
    const text = applyPronunciations(script.body, prons);
    let result;
    try {
      result = await this.withTimeout((signal) => provider.synthesize({ providerVoiceRef: voice!.provider_voice_ref!, text, language: script.language ?? voice!.languages[0] ?? "ar", dialect: voice!.dialects[0], modelVersion: voice!.model_version, signal }), job.timeout_ms);
    } catch (e) {
      const pe = e instanceof ProviderError ? e : new ProviderError("provider_error", safeError(e), true);
      const final = !pe.retryable || job.attempts >= job.max_attempts;
      if (final) return fail("failed", pe.code, pe.message + ".", "failed_released");
      await this.repo.update("voice_jobs", { id: job.id }, { status: "queued", error_code: pe.code, error_message: `Attempt ${job.attempts} failed; retrying.`, lease_until: null });
      await this.audit(null, "job", "job_retry", "voice_job", job.id, { code: pe.code, attempt: job.attempts });
      return (await this.repo.one("voice_jobs", { id: job.id }))!;
    }
    const path = `${p.workspace_id}/${p.id}.${result.mime === "audio/mpeg" ? "mp3" : "wav"}`;
    await this.repo.putObject("voices-outputs-private", path, result.audio, result.mime);
    await this.repo.update("voice_jobs", { id: job.id }, { status: "succeeded", output_path: path, output_mime: result.mime, output_seconds: result.seconds, chars_billed: result.chars, provider_cost_usd_micros: result.costUsdMicros, is_demo: result.isDemo, error_code: null, error_message: null, lease_until: null });
    await this.settle(p.id);
    return (await this.repo.one("voice_jobs", { id: job.id }))!;
  }

  /** Capture + ledger. Safe to call repeatedly (duplicate Wallet callbacks / retries post nothing). */
  async settle(purchaseId: string): Promise<T.PurchaseRow> {
    const p = (await this.repo.one("voice_purchases", { id: purchaseId }))!;
    const job = await this.repo.one("voice_jobs", { purchase_id: p.id });
    if (!job || job.status !== "succeeded") throw conflict("not_generated", "Nothing to settle yet.");
    if (p.status === "refunded") return p;
    const providerCost = usdMicrosToIxisCeil(Number(job.provider_cost_usd_micros));
    const rule = p.terms_snapshot.creator_compensation;
    if (p.funding === "allowance") {
      const ws = (await this.repo.one("voice_workspaces", { id: p.workspace_id }))!;
      const pkg = ws.package_id ? await this.repo.one("voice_packages", { id: ws.package_id }) : null;
      const value = pkg ? allowanceUnitValue(pkg) * p.allowance_units : 0;
      if (value > 0) await this.repo.postLedger(allowanceSpendTx({ purchaseId: p.id, workspaceId: p.workspace_id, creatorId: p.creator_id, split: splitAmount(value, rule, providerCost) }));
      if (p.status !== "fulfilled") await this.repo.update("voice_purchases", { id: p.id }, { status: "fulfilled" });
    } else {
      if (!p.wallet_reservation_id) throw conflict("no_hold", "No Wallet hold on this purchase.");
      let receiptId = p.wallet_receipt_id;
      if (!receiptId) {
        try {
          receiptId = (await this.wallet.capture(p.wallet_reservation_id)).receiptId;
        } catch (e) {
          // Leave it held; reconcile() asks the Wallet and finishes or releases. Never fake success.
          await this.audit(null, "payment", "capture_failed", "voice_purchase", p.id, { error: safeError(e) });
          return p;
        }
      }
      await this.repo.postLedger(captureTx({ purchaseId: p.id, reservationId: p.wallet_reservation_id, creatorId: p.creator_id, split: splitAmount(p.price_ixis, rule, providerCost) }));
      if (p.status !== "fulfilled" || p.wallet_receipt_id !== receiptId) await this.repo.update("voice_purchases", { id: p.id }, { status: "fulfilled", wallet_receipt_id: receiptId });
    }
    await this.audit(null, "payment", "purchase_fulfilled", "voice_purchase", p.id, { funding: p.funding });
    return (await this.repo.one("voice_purchases", { id: p.id }))!;
  }

  /** Paid-but-unfulfilled: release the Wallet hold or restore allowance. Nothing captured = nothing to refund. */
  private async unwindPayment(p: T.PurchaseRow, status: "failed_released" | "cancelled", reason: string) {
    const cur = (await this.repo.one("voice_purchases", { id: p.id }))!;
    if (cur.status !== "payment_held") {
      if (["pending_approval", "approved", "awaiting_payment"].includes(cur.status)) await this.repo.update("voice_purchases", { id: p.id }, { status: "cancelled" });
      return;
    }
    if (cur.funding === "allowance") await this.repo.restoreAllowance(cur.workspace_id, cur.allowance_units);
    else if (cur.wallet_reservation_id) {
      try { await this.wallet.release(cur.wallet_reservation_id); } catch (e) {
        await this.audit(null, "payment", "release_failed", "voice_purchase", cur.id, { error: safeError(e) });
        return; // stays payment_held → reconcile()
      }
    }
    await this.repo.update("voice_purchases", { id: cur.id }, { status });
    await this.audit(null, "payment", cur.funding === "allowance" ? "allowance_restored" : "hold_released", "voice_purchase", cur.id, { reason });
  }

  /** On pause / suspension / retirement: stop every unfulfilled purchase of this voice. */
  async stopUnfulfilled(voiceId: string, reason: string) {
    const ps = await this.repo.find("voice_purchases", { voice_id: voiceId, status: { in: ["pending_approval", "approved", "awaiting_payment", "payment_held"] } });
    for (const p of ps) {
      const job = await this.repo.one("voice_jobs", { purchase_id: p.id });
      if (job?.status === "succeeded") { await this.settle(p.id); continue; } // delivered before the stop → follows its own terms
      if (job && (job.status === "queued" || job.status === "running")) await this.repo.update("voice_jobs", { id: job.id }, { status: "cancelled", error_code: reason, error_message: "Voice became unavailable; nothing was charged.", lease_until: null });
      await this.unwindPayment(p, "cancelled", reason);
      const a = await this.repo.one("voice_approval_requests", { purchase_id: p.id });
      if (a && a.status === "pending") await this.repo.update("voice_approval_requests", { id: a.id }, { status: "expired" });
    }
  }

  /** Worker / cron: run queued jobs (bounded). */
  async runQueued(limit = 5) {
    const jobs = await this.repo.find("voice_jobs", { status: { in: ["queued", "running"] } }, { order: "created_at", limit });
    const out = [];
    for (const j of jobs) out.push(await this.runJob(j.id));
    return out;
  }

  // ------------------------------------------------------------ downloads, receipts
  async purchaseForActor(actor: Actor, purchaseId: string) {
    const p = await this.repo.one("voice_purchases", { id: purchaseId });
    if (!p) throw notFound("Purchase");
    if (!this.isAdmin(actor)) await this.requireMember(actor, p.workspace_id);
    return p;
  }

  async receipt(actor: Actor, purchaseId: string) {
    const p = await this.purchaseForActor(actor, purchaseId);
    const job = await this.repo.one("voice_jobs", { purchase_id: p.id });
    const s = p.terms_snapshot;
    const providerCost = job ? usdMicrosToIxisCeil(Number(job.provider_cost_usd_micros)) : 0;
    const split: Split | null = (p.status === "fulfilled" || p.status === "refunded") && p.funding !== "allowance" ? splitAmount(p.price_ixis, s.creator_compensation, providerCost) : null;
    return { purchase: p, job, summary: licenseSummary(s), split, legal: LEGAL_REVIEW_NOTE, isDemo: p.is_demo };
  }

  async downloadUrl(actor: Actor, purchaseId: string) {
    const p = await this.purchaseForActor(actor, purchaseId);
    if (p.status !== "fulfilled") throw conflict("not_ready", "Audio is not ready.");
    const job = await this.repo.one("voice_jobs", { purchase_id: p.id });
    if (!job?.output_path) throw conflict("not_ready", "Audio is not ready.");
    await this.audit(actor, "data", "audio_download", "voice_purchase", p.id);
    return this.repo.signedUrl(job.output_bucket ?? "voices-outputs-private", job.output_path, SIGNED_URL_TTL_SECONDS);
  }

  // ------------------------------------------------------------ refunds, ledger, earnings
  /**
   * Refund a fulfilled purchase. The Wallet has no post-capture refund call yet, so the customer
   * gets Lyrixis credit (wallet) or the allowance back, and the ledger reverses every line.
   */
  async adminRefund(actorIn: Actor, purchaseId: string, reason: string) {
    const actor = this.requireAdmin(actorIn);
    const p = await this.repo.one("voice_purchases", { id: purchaseId });
    if (!p) throw notFound("Purchase");
    if (p.status === "refunded") return p;
    if (p.status !== "fulfilled") throw conflict("bad_state", "Only fulfilled purchases can be refunded (unfulfilled ones are released automatically).");
    const job = await this.repo.one("voice_jobs", { purchase_id: p.id });
    const s = p.terms_snapshot.creator_compensation;
    const ws = (await this.repo.one("voice_workspaces", { id: p.workspace_id }))!;
    let gross = p.price_ixis;
    if (p.funding === "allowance") {
      const pkg = ws.package_id ? await this.repo.one("voice_packages", { id: ws.package_id }) : null;
      gross = pkg ? allowanceUnitValue(pkg) * p.allowance_units : 0;
    }
    const split = splitAmount(gross, s, usdMicrosToIxisCeil(Number(job?.provider_cost_usd_micros ?? 0)));
    const bal = await this.creatorBalances(p.creator_id);
    if (gross > 0) await this.repo.postLedger(refundTx({ purchaseId: p.id, workspaceId: p.workspace_id, creatorId: p.creator_id, split, creatorPending: bal.pending, toAllowance: p.funding === "allowance" }));
    if (p.funding === "allowance") await this.repo.restoreAllowance(p.workspace_id, p.allowance_units);
    else await this.repo.update("voice_workspaces", { id: ws.id }, { credit_ixis: ws.credit_ixis + p.price_ixis });
    await this.repo.update("voice_purchases", { id: p.id }, { status: "refunded" });
    await this.audit(actor, "payment", "refund", "voice_purchase", p.id, { reason, gross, as: p.funding === "allowance" ? "allowance" : "lyrixis_credit" });
    return (await this.repo.one("voice_purchases", { id: p.id }))!;
  }

  async accountBalance(code: string): Promise<number> {
    const acct = await this.repo.one("voice_ledger_accounts", { code });
    if (!acct) return 0;
    const entries = await this.repo.find("voice_ledger_entries", { account_id: acct.id });
    return entries.reduce((s, e) => s + Number(e.amount_ixis), 0);
  }

  async creatorBalances(creatorId: string) {
    const [pending, available, paid] = await Promise.all([
      this.accountBalance(ACCOUNTS.creator(creatorId, "pending")),
      this.accountBalance(ACCOUNTS.creator(creatorId, "available")),
      this.accountBalance(ACCOUNTS.creator(creatorId, "paid")),
    ]);
    return { pending: creditNormal(pending), available: creditNormal(available), paid: creditNormal(paid) };
  }

  /** Move creator_share older than the hold window from pending to available. Idempotent per purchase. */
  async releaseMaturedEarnings() {
    const txs = await this.repo.find("voice_ledger_transactions", { kind: { in: ["purchase_capture", "allowance_spend"] } });
    let released = 0;
    for (const tx of txs) {
      if (!tx.purchase_id) continue;
      const p = await this.repo.one("voice_purchases", { id: tx.purchase_id });
      if (!p || p.status !== "fulfilled") continue;
      const hold = p.terms_snapshot.creator_compensation.earnings_hold_days * 86_400_000;
      if (Date.parse(tx.created_at) + hold > this.now().getTime()) continue;
      const entries = await this.repo.find("voice_ledger_entries", { transaction_id: tx.id, line: "creator_share" });
      const amount = entries.reduce((s, e) => s - Number(e.amount_ixis), 0);
      if (amount <= 0) continue;
      const r = await this.repo.postLedger(releaseTx({ key: `release:${p.id}`, creatorId: p.creator_id, amount }));
      if (!r.duplicate) released += amount;
    }
    return { released };
  }

  /** Payouts are blocked: no Wallet "pay a creator from the app" call yet, no Stripe Connect. */
  async requestPayout(): Promise<never> {
    throw new VoicesError(501, "payout_blocked", "Payouts aren't available yet. Earnings stay on your Lyrixis ledger (in Ixis) until the Apixis Wallet supports creator payouts.");
  }

  async reconcile(actorIn: Actor | null) {
    if (actorIn) this.requireAdmin(actorIn);
    const issues: string[] = [];
    const fixed: string[] = [];
    const held = await this.repo.find("voice_purchases", { status: "payment_held" });
    for (const p of held) {
      const job = await this.repo.one("voice_jobs", { purchase_id: p.id });
      if (!job) continue;
      if (job.status === "succeeded") { const r = await this.settle(p.id); if (r.status === "fulfilled") fixed.push(`settled ${p.id}`); else issues.push(`purchase ${p.id} delivered, capture still pending`); }
      else if (["failed", "blocked", "cancelled"].includes(job.status)) { await this.unwindPayment(p, "failed_released", "reconcile"); fixed.push(`released ${p.id}`); }
      else if (p.wallet_reservation_id) {
        const st = await this.wallet.status(p.wallet_reservation_id);
        if (st === "expired" || st === "released") issues.push(`purchase ${p.id} hold ${st} while job ${job.status}`);
      }
    }
    const entries = await this.repo.find("voice_ledger_entries");
    const total = entries.reduce((s, e) => s + Number(e.amount_ixis), 0);
    if (total !== 0) issues.push(`ledger out of balance by ${total}`);
    const byTx = new Map<string, number>();
    for (const e of entries) byTx.set(e.transaction_id, (byTx.get(e.transaction_id) ?? 0) + Number(e.amount_ixis));
    for (const [tx, s] of byTx) if (s !== 0) issues.push(`tx ${tx} unbalanced (${s})`);
    const done = await this.repo.find("voice_purchases", { status: { in: ["fulfilled", "refunded"] } });
    for (const p of done) {
      if (p.funding === "allowance" || p.price_ixis === 0) continue;
      const tx = p.wallet_reservation_id ? await this.repo.one("voice_ledger_transactions", { idempotency_key: `capture:${p.wallet_reservation_id}` }) : null;
      if (!tx) issues.push(`purchase ${p.id} fulfilled without a capture posting`);
    }
    return { ok: issues.length === 0, issues, fixed, checkedEntries: entries.length };
  }

  async creatorDashboard(actor: Actor) {
    const creator = await this.myCreator(actor);
    if (!creator) return null;
    const voices = await this.repo.find("voices", { creator_id: creator.id }, { order: "created_at" });
    const purchases = await this.repo.find("voice_purchases", { creator_id: creator.id }, { order: "created_at", desc: true });
    const approvals = await this.repo.find("voice_approval_requests", { creator_id: creator.id, status: "pending" });
    const custom = await this.repo.find("voice_custom_requests", { creator_id: creator.id }, { order: "created_at", desc: true });
    const balances = await this.creatorBalances(creator.id);
    const adjustments: { kind: string; amount: number; at: string }[] = [];
    for (const b of ["pending", "available"] as const) {
      const acct = await this.repo.one("voice_ledger_accounts", { code: ACCOUNTS.creator(creator.id, b) });
      if (!acct) continue;
      for (const e of await this.repo.find("voice_ledger_entries", { account_id: acct.id })) if (e.line === "refund" || e.line === "adjustment") adjustments.push({ kind: e.line, amount: -Number(e.amount_ixis), at: e.created_at });
    }
    const perms = await Promise.all(voices.map((v) => this.permissions(v)));
    return {
      creator, balances, adjustments, approvals, custom,
      voices: voices.map((v, i) => ({ ...this.publicVoice(v), permissions: publicPermissions(perms[i]) })),
      usage: purchases.map((p) => ({ id: p.id, voice_id: p.voice_id, status: p.status, declared_use: p.terms_snapshot.declared_use, channels: p.terms_snapshot.channels, billed_seconds: p.billed_seconds, price_ixis: p.price_ixis, funding: p.funding, created_at: p.created_at, is_demo: p.is_demo })),
      payoutNote: "Earnings accrue in Ixis on the Lyrixis ledger. Payouts to your Apixis Wallet or to cash aren't available yet (blocked: needs a Wallet creator-payout feature or Stripe Connect). Earnings are not guaranteed.",
    };
  }

  // ------------------------------------------------------------ custom human recordings (manual / admin-assisted)
  async requestCustom(actorIn: Actor, workspaceId: string, voiceId: string, brief: string, declaredUse: string) {
    const actor = await this.requireAccess(actorIn);
    const { ws } = await this.requireMember(actor, workspaceId, ["owner", "admin", "editor"]);
    const voice = await this.repo.one("voices", { id: voiceId });
    if (!voice || voice.status !== "active") throw deny("voice_unavailable", "Voice not available.");
    const perm = await this.permissions(voice);
    const creator = (await this.repo.one("voice_creators", { id: voice.creator_id }))!;
    if (!perm.custom_recordings || !creator.hire_enabled) throw deny("hire_disabled", "This creator isn't taking custom recordings.");
    if ((ALWAYS_BLOCKED_USES as readonly string[]).includes(declaredUse)) throw deny("use_blocked", "That use is not permitted.");
    if (brief.trim().length < 10) throw bad("brief_short", "Describe the recording (10+ characters).");
    const cfg = await this.pricing();
    const r = await this.repo.insert("voice_custom_requests", { workspace_id: ws.id, voice_id: voice.id, creator_id: creator.id, brief: brief.slice(0, 5000), declared_use: declaredUse, status: "requested", quote_ixis: null, purchase_id: null, revisions_used: 0, max_revisions: cfg.custom_included_revisions, delivery_path: null, manual_process: true });
    await this.audit(actor, "payment", "custom_requested", "voice_custom_request", r.id);
    return r;
  }

  async quoteCustom(actor: Actor, requestId: string, ixis: number) {
    const creator = await this.requireCreator(actor);
    const r = await this.repo.one("voice_custom_requests", { id: requestId });
    if (!r || r.creator_id !== creator.id) throw notFound("Request");
    const cfg = await this.pricing();
    if (!Number.isInteger(ixis) || ixis < cfg.custom_min_ixis) throw bad("quote_too_low", `Minimum custom price is ${cfg.custom_min_ixis} Ixis.`);
    if (r.status !== "requested" && r.status !== "quoted") throw conflict("bad_state", `Request is ${r.status}.`);
    await this.repo.update("voice_custom_requests", { id: r.id }, { status: "quoted", quote_ixis: ixis });
    await this.audit(actor, "payment", "custom_quoted", "voice_custom_request", r.id, { ixis });
  }

  /**
   * Accept the quote. Demo mode: a labeled demo acceptance. Live mode: a variable-amount Wallet hold
   * isn't available through the fixed-price redeem pattern yet → admin-assisted (blocker, no fake escrow).
   */
  async acceptCustomQuote(actorIn: Actor, requestId: string) {
    const actor = await this.requireAccess(actorIn);
    const r = await this.repo.one("voice_custom_requests", { id: requestId });
    if (!r) throw notFound("Request");
    await this.requireMember(actor, r.workspace_id, ["owner", "admin", "editor"]);
    if (r.status !== "quoted" || !r.quote_ixis) throw conflict("bad_state", "No quote to accept.");
    if (!this.wallet.isDemo) throw new VoicesError(501, "custom_payment_blocked", "Custom recordings are arranged with admin help for now: a variable-amount Wallet hold (lyrixis.voice.custom) isn't available yet.");
    await this.repo.update("voice_custom_requests", { id: r.id }, { status: "accepted_held" });
    await this.audit(actor, "payment", "custom_accepted_demo", "voice_custom_request", r.id, { ixis: r.quote_ixis });
  }

  async deliverCustom(actor: Actor, requestId: string, file: { mime: string; body: Uint8Array }) {
    const creator = await this.requireCreator(actor);
    const r = await this.repo.one("voice_custom_requests", { id: requestId });
    if (!r || r.creator_id !== creator.id) throw notFound("Request");
    if (r.status !== "accepted_held" && r.status !== "revision_requested") throw conflict("bad_state", `Request is ${r.status}.`);
    const { mime } = validateUpload("sample", file.mime, file.body);
    const path = `custom/${r.id}/${randomBytes(6).toString("hex")}`;
    await this.repo.putObject("voices-outputs-private", path, file.body, mime);
    await this.repo.update("voice_custom_requests", { id: r.id }, { status: "delivered", delivery_path: path });
    await this.audit(actor, "data", "custom_delivered", "voice_custom_request", r.id);
  }

  async customRevisionOrAccept(actorIn: Actor, requestId: string, action: "revise" | "accept") {
    const actor = await this.requireAccess(actorIn);
    const r = await this.repo.one("voice_custom_requests", { id: requestId });
    if (!r) throw notFound("Request");
    await this.requireMember(actor, r.workspace_id, ["owner", "admin", "editor"]);
    if (r.status !== "delivered") throw conflict("bad_state", "Nothing delivered yet.");
    if (action === "revise") {
      if (r.revisions_used >= r.max_revisions) throw deny("no_revisions_left", `${r.max_revisions} revision(s) included; ask for a new quote for more.`);
      await this.repo.update("voice_custom_requests", { id: r.id }, { status: "revision_requested", revisions_used: r.revisions_used + 1 });
      return;
    }
    const rule = await this.compRule("custom_recording");
    const split = splitAmount(r.quote_ixis ?? 0, rule, 0);
    if (split.gross > 0) await this.repo.postLedger({ ...captureTx({ purchaseId: r.id, reservationId: `custom-${r.id}`, creatorId: r.creator_id, split }), purchase_id: null, memo: `Custom recording accepted (${this.wallet.isDemo ? "demo" : "admin-assisted"})` });
    await this.repo.update("voice_custom_requests", { id: r.id }, { status: "accepted" });
    await this.audit(actor, "payment", "custom_accepted", "voice_custom_request", r.id, { ixis: r.quote_ixis ?? 0 });
  }

  // ------------------------------------------------------------ partner API keys (Socixis)
  async createApiKey(actorIn: Actor, workspaceId: string, label: string, scopes: string[], partner = "socixis") {
    const actor = await this.requireAccess(actorIn);
    await this.requireMember(actor, workspaceId, ["owner", "admin"]);
    const allowed = new Set<string>(API_SCOPES);
    if (!scopes.length || scopes.some((s) => !allowed.has(s))) throw bad("bad_scopes", `Scopes: ${API_SCOPES.join(", ")}`);
    const secret = `lyxv_${partner.replace(/[^a-z]/g, "").slice(0, 6)}_${randomBytes(24).toString("base64url")}`;
    await this.repo.insert("voice_api_keys", { workspace_id: workspaceId, label: label.slice(0, 80), key_prefix: secret.slice(0, 14), key_hash: hashKey(secret), scopes, partner, last_used_at: null, revoked_at: null, created_by: actor.userId });
    await this.audit(actor, "security", "api_key_created", "voice_workspace", workspaceId, { scopes: scopes.join(","), partner });
    return { secret, prefix: secret.slice(0, 14) };
  }

  async authApiKey(bearer: string | null): Promise<{ key: T.ApiKeyRow; ws: T.WorkspaceRow } | null> {
    if (!bearer || !bearer.startsWith("lyxv_")) return null;
    const key = await this.repo.one("voice_api_keys", { key_hash: hashKey(bearer) });
    if (!key || key.revoked_at) return null;
    const ws = await this.repo.one("voice_workspaces", { id: key.workspace_id });
    if (!ws) return null;
    await this.repo.update("voice_api_keys", { id: key.id }, { last_used_at: nowIso(this.now()) });
    return { key, ws };
  }

  // ------------------------------------------------------------ AWAD COMMAND metrics (aggregate only)
  async metrics() {
    const [voices, creators, purchases, auditions, jobs, workspaces, reports] = await Promise.all([
      this.repo.find("voices"), this.repo.find("voice_creators"), this.repo.find("voice_purchases"), this.repo.find("voice_auditions"),
      this.repo.find("voice_jobs"), this.repo.find("voice_workspaces"), this.repo.find("voice_reports", { status: "open" }),
    ]);
    const count = <R>(rows: R[], k: keyof R) => rows.reduce<Record<string, number>>((m, r) => { const v = String(r[k]); m[v] = (m[v] ?? 0) + 1; return m; }, {});
    const real = purchases.filter((p) => !p.is_demo);
    return {
      generated_at: nowIso(this.now()), mode: this.mode,
      voices_by_status: count(voices.filter((v) => !v.is_demo), "status"),
      creators: creators.filter((c) => !c.is_demo).length,
      workspaces: workspaces.filter((w) => !w.is_demo).length,
      purchases_by_status: count(real, "status"),
      gross_ixis_fulfilled: real.filter((p) => p.status === "fulfilled").reduce((s, p) => s + Number(p.price_ixis), 0),
      auditions_total: auditions.filter((a) => !a.is_demo).length,
      jobs_by_status: count(jobs.filter((j) => !j.is_demo), "status"),
      open_reports: reports.length,
      demo_rows_excluded: true,
      note: "Aggregate only. No scripts, recordings, emails or creator identities. Gross is not profit.",
    };
  }
}

export type ApiScope = "voices:read" | "voices:audition" | "projects:write" | "generations:write" | "generations:read" | "receipts:read";
export const API_SCOPES: ApiScope[] = ["voices:read", "voices:audition", "projects:write", "generations:write", "generations:read", "receipts:read"];
export function hashKey(secret: string) { return createHash("sha256").update(`lyxv-key:${secret}`).digest("hex"); }

export const DEFAULT_PERMISSIONS = {
  sample_playback: true, auditions: false, paid_generation: false, publication: false, custom_recordings: false,
  assistant_use: false, training_use: false, allowed_uses: [] as string[], blocked_uses: [...ALWAYS_BLOCKED_USES] as string[],
  allowed_channels: [] as string[], allowed_territories: ["worldwide"], max_term_months: 12, exclusivity_available: false,
};

export function publicCreator(c: T.CreatorRow) {
  return { id: c.id, handle: c.handle, display_name: c.display_name, display_name_ar: c.display_name_ar, bio: c.bio, bio_ar: c.bio_ar, hire_enabled: c.hire_enabled, is_demo: c.is_demo };
}
export function publicPermissions(p: T.PermissionRow) {
  const { created_at: _c, ...rest } = p; void _c;
  return rest;
}

/** Lyrixis-side pronunciation memory: whole-word alias substitution (works with any provider). */
export function applyPronunciations(text: string, prons: { term: string; say_as: string }[]): string {
  let out = text;
  for (const p of [...prons].sort((a, b) => b.term.length - a.term.length)) {
    const esc = p.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`(^|[^\\p{L}\\p{N}])${esc}(?=$|[^\\p{L}\\p{N}])`, "gu"), (_m, pre: string) => `${pre}${p.say_as}`);
  }
  return out;
}
