// HTTP layer for /api/voices/*: one testable dispatcher (runAction) plus small helpers.
// Route files stay thin; every rule lives in VoicesService.
import { z } from "zod";
import { VoicesError, bad } from "./errors";
import type { Actor, LicenseRequest, VoicesService } from "./service";

export type Upload = { mime: string; body: Uint8Array; name?: string };
export type Body = Record<string, unknown>;
export interface Ctx { svc: VoicesService; actor: Actor | null; ip?: string }

const id = z.string().min(1).max(80);
const licenseReq = z.object({
  script: z.string().min(1).max(6000),
  declared_use: z.string().min(1).max(40),
  channels: z.array(z.string().max(40)).max(12).default([]),
  publication: z.boolean().default(false),
  territory: z.string().max(40).default("gcc"),
  term_months: z.number().int().min(1).max(120).default(12),
  project_id: z.string().max(80).nullable().optional(),
});
export const licenseSchema = licenseReq;

function parse<T extends z.ZodTypeAny>(s: T, v: unknown): z.infer<T> {
  const r = s.safeParse(v);
  if (!r.success) throw bad("bad_request", r.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; "));
  return r.data;
}
function need(ctx: Ctx): Actor {
  if (!ctx.actor) throw new VoicesError(401, "sign_in_required", "Sign in to continue.");
  return ctx.actor;
}
function file(b: Body, key = "file"): Upload {
  const f = b[key] as Upload | undefined;
  if (!f || !(f.body instanceof Uint8Array)) throw bad("file_required", "Attach an audio file.");
  return f;
}
const ws = async (ctx: Ctx) => (await ctx.svc.ensureWorkspace(need(ctx))).id;
const wsFrom = async (ctx: Ctx, b: Body) => (typeof b.workspaceId === "string" ? b.workspaceId : ws(ctx));

type Handler = (ctx: Ctx, b: Body) => Promise<unknown>;

export const ACTIONS: Record<string, Handler> = {
  // ---- customers
  audition: async (c, b) => { const p = parse(z.object({ voiceId: id, text: z.string().min(1).max(400) }), b); return c.svc.audition(need(c), await wsFrom(c, b), p.voiceId, p.text); },
  quote: async (c, b) => { const p = parse(z.object({ voiceId: id, request: licenseReq }), b); return c.svc.quote(need(c), await wsFrom(c, b), p.voiceId, p.request as LicenseRequest); },
  purchase: async (c, b) => {
    const p = parse(z.object({ voiceId: id, request: licenseReq, funding: z.enum(["wallet", "allowance"]).default("wallet"), idempotencyKey: z.string().min(8).max(64) }), b);
    const r = await c.svc.purchase(need(c), await wsFrom(c, b), p.voiceId, p.request as LicenseRequest, { funding: p.funding, idempotencyKey: p.idempotencyKey });
    return { purchaseId: r.purchase.id, status: r.purchase.status, jobStatus: r.job?.status ?? null, duplicate: r.duplicate, priceIxis: r.purchase.price_ixis };
  },
  pay: async (c, b) => { const p = parse(z.object({ purchaseId: id }), b); const r = await c.svc.payApproved(need(c), p.purchaseId); return { purchaseId: r.purchase.id, status: r.purchase.status, jobStatus: r.job?.status ?? null }; },
  status: async (c, b) => { const p = parse(z.object({ purchaseId: id }), b); const r = await c.svc.receipt(need(c), p.purchaseId); return { status: r.purchase.status, jobStatus: r.job?.status ?? null }; },
  download: async (c, b) => { const p = parse(z.object({ purchaseId: id }), b); return { url: await c.svc.downloadUrl(need(c), p.purchaseId) }; },
  report: async (c, b) => {
    const p = parse(z.object({ voiceId: id, reason: z.enum(["impersonation", "no_consent", "misuse", "quality", "other"]), details: z.string().max(2000).default("") }), b);
    return c.svc.report(c.actor, p.voiceId, p.reason, p.details);
  },
  "custom.request": async (c, b) => { const p = parse(z.object({ voiceId: id, brief: z.string().min(10).max(4000), declaredUse: z.string().max(40) }), b); return c.svc.requestCustom(need(c), await wsFrom(c, b), p.voiceId, p.brief, p.declaredUse); },
  "custom.accept-quote": async (c, b) => c.svc.acceptCustomQuote(need(c), parse(z.object({ requestId: id }), b).requestId),
  "custom.finish": async (c, b) => { const p = parse(z.object({ requestId: id, action: z.enum(["revise", "accept"]) }), b); return c.svc.customRevisionOrAccept(need(c), p.requestId, p.action); },
  // ---- workspace
  "workspace.update": async (c, b) => {
    const p = parse(z.object({ name: z.string().max(80).optional(), brand_name: z.string().max(80).nullable().optional(), monthly_spend_cap_ixis: z.number().int().min(0).max(10_000_000).nullable().optional(), preferred_voice_id: z.string().max(80).nullable().optional() }), b);
    return c.svc.updateWorkspace(need(c), await wsFrom(c, b), p);
  },
  "workspace.project": async (c, b) => c.svc.createProject(need(c), await wsFrom(c, b), parse(z.object({ name: z.string().min(1).max(120) }), b).name),
  "workspace.pronunciation": async (c, b) => { const p = parse(z.object({ term: z.string().min(1).max(80), sayAs: z.string().min(1).max(160), language: z.string().max(8).default("ar") }), b); return c.svc.addPronunciation(need(c), await wsFrom(c, b), p.term, p.sayAs, p.language); },
  "workspace.apikey": async (c, b) => { const p = parse(z.object({ label: z.string().min(1).max(80), scopes: z.array(z.string()).min(1) }), b); return c.svc.createApiKey(need(c), await wsFrom(c, b), p.label, p.scopes); },
  // ---- creators
  "creator.become": async (c, b) => c.svc.becomeCreator(need(c), parse(z.object({ handle: z.string(), display_name: z.string().min(2).max(60), display_name_ar: z.string().max(60).nullable().optional(), bio: z.string().max(1000).nullable().optional(), bio_ar: z.string().max(1000).nullable().optional(), adult: z.boolean(), accept_creator_terms: z.boolean(), hire_enabled: z.boolean().optional() }), b), c.ip),
  "creator.voice": async (c, b) => c.svc.createVoiceDraft(need(c), parse(z.object({ slug: z.string(), display_name: z.string().min(2).max(60), display_name_ar: z.string().max(60).nullable().optional(), description: z.string().max(1000).nullable().optional(), description_ar: z.string().max(1000).nullable().optional(), languages: z.array(z.string()).min(1), dialects: z.array(z.string()).min(1), tones: z.array(z.string()).default([]), use_categories: z.array(z.string()).default([]), licensing_mode: z.enum(["instant", "approval_required"]).default("instant") }), b)),
  "creator.permissions": async (c, b) => {
    const p = parse(z.object({ voiceId: id, licensing_mode: z.enum(["instant", "approval_required"]).optional(), patch: z.object({ sample_playback: z.boolean(), auditions: z.boolean(), paid_generation: z.boolean(), publication: z.boolean(), custom_recordings: z.boolean(), assistant_use: z.boolean(), allowed_uses: z.array(z.string()), blocked_uses: z.array(z.string()), allowed_channels: z.array(z.string()), allowed_territories: z.array(z.string()), max_term_months: z.number().int().min(1).max(120) }).partial() }), b);
    return c.svc.setPermissions(need(c), p.voiceId, p.patch, p.licensing_mode);
  },
  "creator.sample": async (c, b) => { const p = parse(z.object({ voiceId: id, title: z.string().min(1).max(80), language: z.string().max(8), dialect: z.string().max(20).nullable().optional(), transcript: z.string().max(2000).nullable().optional() }), b); const f = file(b); return c.svc.uploadSample(need(c), p.voiceId, { ...p, mime: f.mime, body: f.body }); },
  "creator.training": async (c, b) => { const p = parse(z.object({ voiceId: id }), b); const f = file(b); return c.svc.uploadTraining(need(c), p.voiceId, { mime: f.mime, body: f.body }); },
  "creator.consent": async (c, b) => { const p = parse(z.object({ voiceId: id, accept: z.boolean(), typed_name: z.string().min(2).max(80) }), b); return c.svc.giveCloningConsent(need(c), p.voiceId, p, c.ip); },
  "creator.revoke": async (c, b) => { const p = parse(z.object({ voiceId: id, reason: z.string().max(500).default("") }), b); return c.svc.revokeCloningConsent(need(c), p.voiceId, p.reason); },
  "creator.submit": async (c, b) => c.svc.submitForReview(need(c), parse(z.object({ voiceId: id }), b).voiceId),
  "creator.verify": async (c, b) => { const p = parse(z.object({ voiceId: id }), b); const f = file(b); return c.svc.submitProviderVerification(need(c), p.voiceId, f); },
  "creator.pause": async (c, b) => c.svc.creatorPause(need(c), parse(z.object({ voiceId: id }), b).voiceId),
  "creator.resume": async (c, b) => c.svc.creatorResume(need(c), parse(z.object({ voiceId: id }), b).voiceId),
  "creator.retire": async (c, b) => c.svc.creatorRetire(need(c), parse(z.object({ voiceId: id }), b).voiceId),
  "creator.approval": async (c, b) => { const p = parse(z.object({ approvalId: id, approve: z.boolean(), note: z.string().max(500).default("") }), b); return c.svc.decideApproval(need(c), p.approvalId, p.approve, p.note); },
  "creator.custom-quote": async (c, b) => { const p = parse(z.object({ requestId: id, ixis: z.number().int().min(1) }), b); return c.svc.quoteCustom(need(c), p.requestId, p.ixis); },
  "creator.custom-deliver": async (c, b) => { const p = parse(z.object({ requestId: id }), b); return c.svc.deliverCustom(need(c), p.requestId, file(b)); },
  "creator.payout": async (c) => { need(c); return c.svc.requestPayout(); },
  // ---- admin (service enforces admin)
  "admin.verify": async (c, b) => { const p = parse(z.object({ voiceId: id, passed: z.boolean(), notes: z.string().min(3).max(1000) }), b); return c.svc.adminManualVerify(need(c), p.voiceId, p.passed, p.notes); },
  "admin.review": async (c, b) => { const p = parse(z.object({ voiceId: id, decision: z.enum(["approved", "changes_requested", "rejected"]), notes: z.string().max(1000).default("") }), b); return c.svc.adminReview(need(c), p.voiceId, p.decision, p.notes); },
  "admin.dialect": async (c, b) => { const p = parse(z.object({ voiceId: id, decision: z.enum(["approved", "changes_requested"]), nativeSpeakerOf: z.string().min(2).max(40), notes: z.string().max(1000).default("") }), b); return c.svc.adminDialectReview(need(c), p.voiceId, p.decision, p.nativeSpeakerOf, p.notes); },
  "admin.sample": async (c, b) => { const p = parse(z.object({ sampleId: id, approve: z.boolean() }), b); return c.svc.adminApproveSample(need(c), p.sampleId, p.approve); },
  "admin.suspend": async (c, b) => { const p = parse(z.object({ voiceId: id, reason: z.string().min(3).max(500) }), b); return c.svc.adminSuspend(need(c), p.voiceId, p.reason); },
  "admin.reinstate": async (c, b) => c.svc.adminReinstate(need(c), parse(z.object({ voiceId: id }), b).voiceId),
  "admin.link-provider": async (c, b) => { const p = parse(z.object({ voiceId: id, provider: z.enum(["elevenlabs"]).default("elevenlabs"), ref: z.string().min(6).max(64) }), b); return c.svc.adminLinkProviderVoice(need(c), p.voiceId, p.provider, p.ref); },
  "admin.invite": async (c, b) => { const p = parse(z.object({ email: z.string().email(), role: z.enum(["customer", "creator", "both"]).default("both"), note: z.string().max(200).optional() }), b); return c.svc.adminInvite(need(c), p.email, p.role, p.note); },
  "admin.allowance": async (c, b) => { const p = parse(z.object({ workspaceId: id, units: z.number().int().min(1).max(500), packageId: z.string().max(40), note: z.string().min(3).max(300) }), b); return c.svc.adminGrantAllowance(need(c), p.workspaceId, p.units, p.packageId, p.note); },
  "admin.refund": async (c, b) => { const p = parse(z.object({ purchaseId: id, reason: z.string().min(3).max(500) }), b); return c.svc.adminRefund(need(c), p.purchaseId, p.reason); },
  "admin.report": async (c, b) => { const p = parse(z.object({ reportId: id, action: z.enum(["actioned", "dismissed"]), suspend: z.boolean().default(false) }), b); return c.svc.adminResolveReport(need(c), p.reportId, p.action, p.suspend); },
  "admin.pricing": async (c, b) => {
    const n = z.number().int().min(0).max(1_000_000);
    const p = parse(z.object({ payg_base_ixis: n.min(1), payg_base_seconds: n.min(1), payg_step_ixis: n, payg_step_seconds: n.min(1), payg_max_seconds: n.min(1), audition_max_seconds: n.min(1).max(60), free_auditions_per_day: n.max(100), audition_ixis: n, custom_min_ixis: n.min(1), custom_included_revisions: n.max(5), illustrative: z.boolean(), notes: z.string().max(500).nullable().default(null) }), b);
    return c.svc.adminSetPricing(need(c), p);
  },
  "admin.reconcile": async (c) => c.svc.reconcile(c.svc.requireAdmin(need(c))),
  "admin.release": async (c) => { c.svc.requireAdmin(need(c)); return c.svc.releaseMaturedEarnings(); },
};

export async function runAction(ctx: Ctx, name: string, body: Body): Promise<unknown> {
  const h = Object.prototype.hasOwnProperty.call(ACTIONS, name) ? ACTIONS[name] : undefined;
  if (!h) throw new VoicesError(404, "unknown_action", "Unknown action.");
  if (!ctx.actor && name !== "report") need(ctx);
  return h(ctx, body);
}

export function toErrorJson(e: unknown): { status: number; body: { error: string; message: string } & Record<string, unknown> } {
  if (e instanceof VoicesError) return { status: e.status, body: { error: e.code, message: e.message, ...(e.extra ?? {}) } };
  console.error("[voices] unexpected", e instanceof Error ? e.message : "unknown");
  return { status: 500, body: { error: "internal", message: "Something went wrong. Nothing was charged unless a receipt says so." } };
}

/** Parse JSON or multipart (uploads) into a Body. */
export async function readBody(req: Request): Promise<Body> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.startsWith("multipart/form-data")) {
    const fd = await req.formData();
    const out: Body = {};
    for (const [k, v] of fd.entries()) {
      if (typeof v === "string") out[k] = v;
      else out[k] = { mime: v.type, name: v.name, body: new Uint8Array(await v.arrayBuffer()) } satisfies Upload;
    }
    return out;
  }
  try { return ((await req.json()) ?? {}) as Body; } catch { throw bad("bad_json", "Body must be JSON."); }
}
