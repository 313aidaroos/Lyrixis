import { describe, it, expect } from "vitest";
import { setup, req } from "./helpers";
import { handlePartner } from "../partner-api";
import { runAction } from "../http";

const H = (h: Record<string, string>) => new Headers(h);
const call = (svc: Parameters<typeof handlePartner>[0], method: string, path: string, headers: Record<string, string>, body: unknown = null) =>
  handlePartner(svc, { method, path: path.split("/").filter(Boolean), headers: H(headers), body, query: new URLSearchParams() });

describe("Socixis partner API contract", () => {
  it("auth, scopes, idempotency, generation → status → output → receipt", async () => {
    const { svc, customer, wsA, voice } = await setup();
    expect((await call(svc, "GET", "voices", {})).status).toBe(401);
    const { secret } = await svc.createApiKey(customer, wsA.id, "socixis test", ["voices:read", "generations:write", "generations:read", "receipts:read"]);
    const auth = { authorization: `Bearer ${secret}`, "x-socixis-org": "demo-socixis-org" };
    const list = await call(svc, "GET", "voices", auth);
    expect(list.status).toBe(200);
    expect(JSON.stringify(list.body)).not.toMatch(/provider_voice_ref/);
    expect((await call(svc, "POST", "auditions", auth, { voice_id: "x", text: "hi" })).status).toBe(403);
    const v = await voice("demo-najdi-business");
    const el = await call(svc, "POST", "eligibility", auth, { voice_id: v.id, request: req() });
    expect(el.body).toMatchObject({ eligible: true, price_ixis: 500 });
    const blocked = await call(svc, "POST", "eligibility", auth, { voice_id: v.id, request: req("x", { declared_use: "political" }) });
    expect(blocked.body).toMatchObject({ eligible: false });
    expect((await call(svc, "POST", "generations", auth, { voice_id: v.id, request: req() })).status).toBe(400);
    const body = { voice_id: v.id, request: req() };
    const g = await call(svc, "POST", "generations", { ...auth, "idempotency-key": "sx-gen-0001" }, body);
    expect(g.status).toBe(202);
    const replay = await call(svc, "POST", "generations", { ...auth, "idempotency-key": "sx-gen-0001" }, body);
    expect(replay.body).toMatchObject({ replayed: true });
    expect((await call(svc, "POST", "generations", { ...auth, "idempotency-key": "sx-gen-0001" }, { ...body, request: req("other") })).status).toBe(409);
    const gid = (g.body as { generation_id: string }).generation_id;
    expect((await svc.repo.find("voice_purchases")).length).toBe(1);
    await svc.runQueued(5);
    expect((await call(svc, "GET", `generations/${gid}`, auth)).body).toMatchObject({ status: "fulfilled" });
    expect((await call(svc, "GET", `generations/${gid}/output`, auth)).status).toBe(200);
    const rc = await call(svc, "GET", `receipts/${gid}`, auth);
    expect(rc.body).toMatchObject({ price_ixis: 500, is_demo: true });
  });
  it("org mapping and metrics key", async () => {
    const { svc, customer, wsA } = await setup();
    await svc.repo.update("voice_workspaces", { id: wsA.id }, { socixis_org_id: "org_123" });
    const { secret } = await svc.createApiKey(customer, wsA.id, "k", ["voices:read"]);
    expect((await call(svc, "GET", "voices", { authorization: `Bearer ${secret}`, "x-socixis-org": "org_999" })).status).toBe(403);
    expect((await call(svc, "GET", "voices", { authorization: `Bearer ${secret}`, "x-socixis-org": "org_123" })).status).toBe(200);
    process.env.AWAD_COMMAND_METRICS_KEY = "metrics-key-for-tests-0123456789";
    expect((await call(svc, "GET", "metrics", { authorization: "Bearer nope" })).status).toBe(401);
    expect((await call(svc, "GET", "metrics", { authorization: "Bearer metrics-key-for-tests-0123456789" })).status).toBe(200);
  });
});

describe("action dispatcher", () => {
  it("requires sign-in, validates input, enforces admin", async () => {
    const { svc, customer, voice } = await setup();
    await expect(runAction({ svc, actor: null }, "quote", {})).rejects.toMatchObject({ code: "sign_in_required" });
    await expect(runAction({ svc, actor: customer }, "quote", { voiceId: "x" })).rejects.toMatchObject({ code: "bad_request" });
    await expect(runAction({ svc, actor: customer }, "admin.reconcile", {})).rejects.toMatchObject({ code: "admin_only" });
    await expect(runAction({ svc, actor: customer }, "__proto__", {})).rejects.toMatchObject({ code: "unknown_action" });
    const v = await voice("demo-najdi-business");
    const r = await runAction({ svc, actor: customer }, "purchase", { voiceId: v.id, request: req(), idempotencyKey: "ui-000001" });
    expect(r).toMatchObject({ status: "fulfilled", priceIxis: 500 });
    await expect(runAction({ svc, actor: customer }, "creator.payout", {})).rejects.toMatchObject({ code: "payout_blocked" });
  });
});

describe("Cixy recommendations", () => {
  it("are read-only, opt-in per voice, and rank by dialect", async () => {
    const { svc, repo, voice } = await setup();
    const before = (await repo.find("voice_audit_events")).length;
    const r = await svc.recommend({ dialect: "ar-egy", text: "podcast story" });
    expect(r[0].slug).toBe("demo-egyptian-storyteller");
    expect(JSON.stringify(r)).not.toMatch(/provider|demo:/);
    const v = await voice("demo-egyptian-storyteller");
    await repo.update("voice_permission_versions", { voice_id: v.id }, { assistant_use: false });
    expect((await svc.recommend({ dialect: "ar-egy" })).some((x) => x.slug === v.slug)).toBe(false);
    expect((await repo.find("voice_audit_events")).length).toBe(before);
  });
});
