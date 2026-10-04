// Socixis (and future partner) API: /api/v1/voices/*. Lyrixis side only — the contract lives in
// docs/voices/SOCIXIS_INTEGRATION.md. Bearer lyxv_ keys are workspace-scoped with explicit scopes.
// Generations require an Idempotency-Key; replays return the stored response, a different body → 409.
import { createHash, timingSafeEqual } from "node:crypto";
import { VoicesError, bad } from "./errors";
import { licenseSchema, toErrorJson } from "./http";
import { canonicalJson } from "./terms";
import type { Actor, ApiScope, LicenseRequest, VoicesService } from "./service";
import type { WorkspaceRow } from "./types";

export interface PartnerReq { method: string; path: string[]; headers: Headers; body: unknown; query: URLSearchParams }
export interface PartnerRes { status: number; body: unknown }

export const PARTNER_API_VERSION = "2026-10-01";

function scope(have: string[], need: ApiScope) {
  if (!have.includes(need)) throw new VoicesError(403, "insufficient_scope", `This key lacks ${need}.`);
}

function safeEq(a: string, b: string) {
  const x = Buffer.from(a); const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

async function ownerActor(svc: VoicesService, ws: WorkspaceRow, createdBy: string | null): Promise<Actor> {
  const uid = createdBy ?? ws.owner_user_id;
  const u = await svc.repo.one("users", { id: uid });
  if (!u) throw new VoicesError(401, "invalid_key", "Key owner no longer exists.");
  return { userId: u.id, email: u.email, walletOwner: u.email, isAdmin: false };
}

export async function handlePartner(svc: VoicesService, r: PartnerReq): Promise<PartnerRes> {
  try {
    const auth = r.headers.get("authorization") ?? "";
    const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
    // AWAD COMMAND aggregate metrics: separate key, read-only, no PII.
    if (r.path[0] === "metrics" && r.method === "GET") {
      const key = process.env.AWAD_COMMAND_METRICS_KEY;
      if (!key || !bearer || !safeEq(bearer, key)) return { status: 401, body: { error: "unauthorized" } };
      return { status: 200, body: await svc.metrics() };
    }
    const authd = await svc.authApiKey(bearer);
    if (!authd) return { status: 401, body: { error: "invalid_key", message: "Send Authorization: Bearer lyxv_…" } };
    const { key, ws } = authd;
    const org = r.headers.get("x-socixis-org");
    if (ws.socixis_org_id && org !== ws.socixis_org_id) return { status: 403, body: { error: "org_mismatch", message: "X-Socixis-Org does not match this key's workspace." } };
    const actor = await ownerActor(svc, ws, key.created_by);
    const [a, b, c] = r.path;
    const body = (r.body ?? {}) as Record<string, unknown>;
    const ok = (x: unknown, status = 200): PartnerRes => ({ status, body: x });

    if (r.method === "GET" && a === "voices" && !b) {
      scope(key.scopes, "voices:read");
      const list = await svc.catalog({ q: r.query.get("q") ?? undefined, language: r.query.get("language") ?? undefined, dialect: r.query.get("dialect") ?? undefined, use: r.query.get("use") ?? undefined, tone: r.query.get("tone") ?? undefined });
      return ok({ api_version: PARTNER_API_VERSION, voices: list.map((e) => ({ id: e.voice.id, slug: e.voice.slug, name: e.voice.display_name, name_ar: e.voice.display_name_ar, languages: e.voice.languages, dialects: e.voice.dialects, tones: e.voice.tones, uses: e.voice.use_categories, licensing_mode: e.voice.licensing_mode, verified: e.voice.earned_verification !== null, from_ixis: e.fromIxis, illustrative_pricing: e.illustrative, is_demo: e.voice.is_demo })) });
    }
    if (r.method === "GET" && a === "voices" && b) {
      scope(key.scopes, "voices:read");
      const d = await svc.voiceBySlug(b, null);
      return ok({ voice: d.voice, creator: d.creator, permissions: d.permissions, samples: d.samples.filter((s) => s.approved).map((s) => ({ id: s.id, title: s.title, language: s.language, dialect: s.dialect, url: s.url })) });
    }
    if (r.method === "POST" && a === "auditions") {
      scope(key.scopes, "voices:audition");
      const voiceId = String(body.voice_id ?? ""); const text = String(body.text ?? "");
      return ok(await svc.audition(actor, ws.id, voiceId, text));
    }
    if (r.method === "POST" && a === "projects") {
      scope(key.scopes, "projects:write");
      return ok(await svc.createProject(actor, ws.id, String(body.name ?? "").slice(0, 120) || "Socixis project"), 201);
    }
    if (r.method === "POST" && a === "eligibility") {
      scope(key.scopes, "voices:read");
      const req = licenseSchema.safeParse(body.request);
      if (!req.success) throw bad("bad_request", "request: script, declared_use, channels, publication, territory, term_months");
      try {
        const q = await svc.quote(actor, ws.id, String(body.voice_id ?? ""), req.data as LicenseRequest);
        return ok({ eligible: true, price_ixis: q.priceIxis, billed_seconds: q.billedSeconds, approval_required: q.approvalRequired, allowance_units: q.allowanceUnits, allowance_available: q.allowanceAvailable, illustrative: q.illustrative, permission_version: q.permissionVersion });
      } catch (e) {
        if (e instanceof VoicesError && e.status < 500 && e.status !== 401) return ok({ eligible: false, reason: e.code, message: e.message });
        throw e;
      }
    }
    if (r.method === "POST" && a === "generations" && !b) {
      scope(key.scopes, "generations:write");
      const idem = r.headers.get("idempotency-key") ?? "";
      if (!/^[A-Za-z0-9_-]{8,64}$/.test(idem)) throw bad("idempotency_key_required", "Send an Idempotency-Key header (8–64 chars).");
      const hash = createHash("sha256").update(canonicalJson(body)).digest("hex");
      const prior = await svc.repo.one("voice_idempotency", { workspace_id: ws.id, route: "generations", key: idem });
      if (prior) {
        if (prior.request_hash !== hash) return { status: 409, body: { error: "idempotency_conflict", message: "This Idempotency-Key was used with a different body." } };
        return { status: prior.status_code, body: { ...(prior.response as object), replayed: true } };
      }
      const req = licenseSchema.safeParse(body.request);
      if (!req.success) throw bad("bad_request", "request: script, declared_use, channels, publication, territory, term_months");
      const funding = body.funding === "allowance" ? "allowance" : "wallet";
      const res = await svc.purchase(actor, ws.id, String(body.voice_id ?? ""), req.data as LicenseRequest, { funding, idempotencyKey: `sx-${idem}`.slice(0, 64), runInline: false });
      const out = { generation_id: res.purchase.id, status: res.purchase.status, job_status: res.job?.status ?? null, price_ixis: res.purchase.price_ixis, terms_hash: res.purchase.terms_hash, is_demo: res.purchase.is_demo };
      await svc.repo.insert("voice_idempotency", { key: idem, workspace_id: ws.id, route: "generations", request_hash: hash, response: out, status_code: 202 });
      return { status: 202, body: out };
    }
    if (r.method === "GET" && a === "generations" && b && !c) {
      scope(key.scopes, "generations:read");
      const rc = await svc.receipt(actor, b);
      return ok({ generation_id: rc.purchase.id, status: rc.purchase.status, job_status: rc.job?.status ?? null, error: rc.job?.error_code ?? null });
    }
    if (r.method === "GET" && a === "generations" && b && c === "output") {
      scope(key.scopes, "generations:read");
      return ok({ url: await svc.downloadUrl(actor, b), expires_in: 300 });
    }
    if (r.method === "GET" && a === "receipts" && b) {
      scope(key.scopes, "receipts:read");
      const rc = await svc.receipt(actor, b);
      return ok({ receipt_id: rc.purchase.id, status: rc.purchase.status, price_ixis: rc.purchase.price_ixis, funding: rc.purchase.funding, terms_version: rc.purchase.terms_version, terms_hash: rc.purchase.terms_hash, terms: rc.purchase.terms_snapshot, summary: rc.summary, legal: rc.legal, is_demo: rc.isDemo });
    }
    return { status: 404, body: { error: "not_found" } };
  } catch (e) {
    const { status, body } = toErrorJson(e);
    return { status, body };
  }
}
