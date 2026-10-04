import { describe, it, expect } from "vitest";
import { setup, newUser, req, wav } from "./helpers";
import { splitAmount } from "../ledger";
import { paygPriceIxis, walletProductFor, estimateSeconds, billedSeconds } from "../pricing";
import { scriptHash, normalizeScript, termsHash } from "../terms";
import { VoicesError } from "../errors";
import { applyPronunciations } from "../service";
import { validateUpload, assertAllowedName } from "../validation";
import { signFileUrl, verifyFileUrl } from "../signing";

const code = async (p: Promise<unknown>) => { try { await p; return "ok"; } catch (e) { return e instanceof VoicesError ? e.code : (e as Error).message; } };

describe("pricing (Awad defaults, illustrative)", () => {
  it("PAYG 500 up to 60s, +250 per started 30s; tier SKUs", async () => {
    const { svc } = await setup();
    const cfg = await svc.pricing();
    expect(cfg.illustrative).toBe(true);
    expect(paygPriceIxis(10, cfg)).toBe(500);
    expect(paygPriceIxis(60, cfg)).toBe(500);
    expect(paygPriceIxis(61, cfg)).toBe(750);
    expect(paygPriceIxis(91, cfg)).toBe(1000);
    expect(billedSeconds(61, cfg)).toBe(90);
    expect(walletProductFor(60)).toBe("lyrixis.voice.generate.60s");
    expect(walletProductFor(90)).toBe("lyrixis.voice.generate.90s");
    expect(() => paygPriceIxis(301, cfg)).toThrow();
  });
  it("creator 60% after 5% Apixis fee and provider cost", () => {
    const s = splitAmount(500, { creator_share_bps: 6000, apixis_fee_bps: 500 }, 10);
    expect(s).toMatchObject({ gross: 500, apixisFee: 25, providerCost: 10, net: 465, creatorShare: 279, lyrixisMargin: 186, tax: 0, processingFee: 0 });
    expect(s.apixisFee + s.providerCost + s.creatorShare + s.lyrixisMargin).toBe(500);
  });
});

describe("purchase → generation → download (demo E2E)", () => {
  it("works end to end and posts a balanced ledger", async () => {
    const { svc, repo, customer, wsA, voice, wallet } = await setup();
    const v = await voice("demo-najdi-business");
    const { purchase, job } = await svc.purchase(customer, wsA.id, v.id, req(), { funding: "wallet", idempotencyKey: "e2e-0001" });
    expect(job?.status).toBe("succeeded");
    expect(purchase.status).toBe("fulfilled");
    expect(purchase.price_ixis).toBe(500);
    expect(wallet.balance(customer.walletOwner)).toBe(4500);
    const url = await svc.downloadUrl(customer, purchase.id);
    const u = new URL(url, "http://x");
    const obj = await repo.getObject(u.searchParams.get("b")!, u.searchParams.get("p")!);
    expect(String.fromCharCode(...obj!.body.slice(0, 4))).toBe("RIFF");
    const r = await svc.receipt(customer, purchase.id);
    expect(r.isDemo).toBe(true);
    expect(r.summary.join(" ")).toMatch(/requires legal review/);
    expect(r.split?.creatorShare).toBe(285);
    expect((await svc.reconcile(null)).ok).toBe(true);
    expect((await svc.creatorBalances(purchase.creator_id)).pending).toBe(285);
  });
});

describe("cross-customer isolation", () => {
  it("another business cannot see or use workspace A's purchases", async () => {
    const { svc, repo, customer, wsA, voice } = await setup();
    const v = await voice("demo-najdi-business");
    const { purchase } = await svc.purchase(customer, wsA.id, v.id, req(), { funding: "wallet", idempotencyKey: "iso-0001" });
    const b = await newUser(repo, "b1");
    await svc.ensureWorkspace(b, "B Co");
    expect(await code(svc.receipt(b, purchase.id))).toBe("not_found");
    expect(await code(svc.downloadUrl(b, purchase.id))).toBe("not_found");
    expect(await code(svc.workspaceOverview(b, wsA.id))).toBe("not_found");
    expect(await code(svc.quote(b, wsA.id, v.id, req()))).toBe("not_found");
    expect(await code(svc.purchase(b, wsA.id, v.id, req(), { funding: "wallet", idempotencyKey: "iso-0002" }))).toBe("not_found");
  });
});

describe("unapproved voices", () => {
  it("cannot be bought, auditioned or generated; approval needs verification", async () => {
    const { svc, repo, customer, creator, admin, wsA } = await setup();
    const c2 = await newUser(repo, "c2");
    await svc.becomeCreator(c2, { handle: "new-creator", display_name: "Layla Test", adult: true, accept_creator_terms: true });
    const draft = await svc.createVoiceDraft(c2, { slug: "layla-draft", display_name: "Layla Test voice", languages: ["ar"], dialects: ["ar-egy"], tones: ["warm"], use_categories: ["ads"], licensing_mode: "instant" });
    await svc.setPermissions(c2, draft.id, { paid_generation: true, auditions: true, publication: true });
    expect(await code(svc.quote(customer, wsA.id, draft.id, req()))).toBe("voice_unavailable");
    expect(await code(svc.purchase(customer, wsA.id, draft.id, req(), { funding: "wallet", idempotencyKey: "unap-0001" }))).toBe("voice_unavailable");
    expect(await code(svc.audition(customer, wsA.id, draft.id, "مرحبا"))).toBe("voice_unavailable");
    expect(await code(svc.voiceBySlug("layla-draft", customer))).toBe("not_found");
    // onboarding → submit → still not purchasable
    await svc.uploadSample(c2, draft.id, { title: "s", language: "ar", mime: "audio/wav", body: wav(5) });
    await svc.uploadTraining(c2, draft.id, { mime: "audio/wav", body: wav(40) });
    expect(await code(svc.submitForReview(c2, draft.id))).toBe("consent_required");
    await svc.giveCloningConsent(c2, draft.id, { accept: true, typed_name: "Layla Test" });
    expect((await svc.submitForReview(c2, draft.id)).status).toBe("review_pending");
    expect(await code(svc.purchase(customer, wsA.id, draft.id, req(), { funding: "wallet", idempotencyKey: "unap-0002" }))).toBe("voice_unavailable");
    expect(await code(svc.adminReview(admin, draft.id, "approved", "ok"))).toBe("not_verified");
    expect(await code(svc.adminReview(creator, draft.id, "approved", "self"))).toBe("admin_only");
    await svc.adminManualVerify(admin, draft.id, true, "voice matches consent recording");
    await svc.adminReview(admin, draft.id, "approved", "ok");
    const { purchase } = await svc.purchase(customer, wsA.id, draft.id, req(), { funding: "wallet", idempotencyKey: "unap-0003" });
    expect(purchase.status).toBe("fulfilled");
  });
  it("training upload alone is not verification; adults only; impersonation names blocked", async () => {
    const { svc, repo } = await setup();
    const u = await newUser(repo, "c3");
    expect(await code(svc.becomeCreator(u, { handle: "kid", display_name: "Kid", adult: false, accept_creator_terms: true }))).toBe("adults_only");
    expect(await code(svc.becomeCreator(u, { handle: "official-x", display_name: "Official Cixy", adult: true, accept_creator_terms: true }))).toBe("reserved_name");
    expect(await code(svc.becomeCreator(u, { handle: "copycat", display_name: "Demo creator 2", adult: true, accept_creator_terms: true }))).toBe("name_taken");
    await svc.becomeCreator(u, { handle: "real-one", display_name: "Real One", adult: true, accept_creator_terms: true });
    const v = await svc.createVoiceDraft(u, { slug: "real-one", display_name: "Real One", languages: ["ar"], dialects: ["ar-lev"], tones: [], use_categories: [], licensing_mode: "instant" });
    await svc.uploadTraining(u, v.id, { mime: "audio/wav", body: wav(40) });
    expect((await repo.one("voices", { id: v.id }))!.verification_status).toBe("unverified");
  });
});

describe("duplicate Wallet callbacks / retries", () => {
  it("settling twice and replaying the purchase key never double-posts earnings or charges", async () => {
    const { svc, repo, customer, wsA, voice, wallet } = await setup();
    const v = await voice("demo-najdi-business");
    const first = await svc.purchase(customer, wsA.id, v.id, req(), { funding: "wallet", idempotencyKey: "dup-00001" });
    const entries = (await repo.find("voice_ledger_entries")).length;
    await svc.settle(first.purchase.id);
    await svc.settle(first.purchase.id);
    const again = await svc.purchase(customer, wsA.id, v.id, req(), { funding: "wallet", idempotencyKey: "dup-00001" });
    expect(again.duplicate).toBe(true);
    expect(again.purchase.id).toBe(first.purchase.id);
    expect((await repo.find("voice_ledger_entries")).length).toBe(entries);
    expect((await svc.creatorBalances(first.purchase.creator_id)).pending).toBe(285);
    expect(wallet.balance(customer.walletOwner)).toBe(4500);
    const r = await repo.postLedger({ key: `capture:${first.purchase.wallet_reservation_id}`, kind: "purchase_capture", purchase_id: first.purchase.id, memo: "replay", entries: [{ account: "wallet_clearing", kind: "asset", amount: 500, line: "customer_payment" }, { account: "lyrixis_voice_revenue", kind: "revenue", amount: -500, line: "licensing_amount" }] });
    expect(r.duplicate).toBe(true);
  });
  it("a lost capture is finished by reconcile, once", async () => {
    const { svc, customer, wsA, voice, wallet } = await setup();
    wallet.failNextCapture = 1;
    const v = await voice("demo-najdi-business");
    const { purchase } = await svc.purchase(customer, wsA.id, v.id, req(), { funding: "wallet", idempotencyKey: "lost-0001" });
    expect(purchase.status).toBe("payment_held");
    const rec = await svc.reconcile(null);
    expect(rec.fixed[0]).toMatch(/settled/);
    await svc.reconcile(null);
    expect((await svc.creatorBalances(purchase.creator_id)).pending).toBe(285);
  });
});

describe("failed jobs", () => {
  it("retry then succeed (bounded)", async () => {
    const { svc, customer, wsA, voice } = await setup({ failTimes: 1 });
    const v = await voice("demo-najdi-business");
    const { purchase, job } = await svc.purchase(customer, wsA.id, v.id, req(), { funding: "wallet", idempotencyKey: "retry-001" });
    expect(job?.attempts).toBe(2);
    expect(purchase.status).toBe("fulfilled");
  });
  it("final failure releases the Wallet hold (never charged)", async () => {
    const { svc, repo, customer, wsA, voice, wallet } = await setup({ failTimes: 10 });
    const v = await voice("demo-najdi-business");
    const { purchase, job } = await svc.purchase(customer, wsA.id, v.id, req(), { funding: "wallet", idempotencyKey: "fail-0001" });
    expect(job?.status).toBe("failed");
    expect(job?.attempts).toBe(3);
    expect(purchase.status).toBe("failed_released");
    expect(wallet.balance(customer.walletOwner)).toBe(5000);
    expect(wallet.captureCalls).toBe(0);
    expect((await repo.find("voice_ledger_entries")).length).toBe(0);
  });
  it("final failure restores allowance", async () => {
    const { svc, repo, customer, admin, wsA, voice } = await setup({ failTimes: 10 });
    await svc.adminGrantAllowance(admin, wsA.id, 8, "solo_monthly", "manual test grant");
    const v = await voice("demo-najdi-business");
    const { purchase } = await svc.purchase(customer, wsA.id, v.id, req(), { funding: "allowance", idempotencyKey: "fail-0002" });
    expect(purchase.status).toBe("failed_released");
    expect((await repo.one("voice_workspaces", { id: wsA.id }))!.allowance_voiceovers).toBe(8);
  });
  it("allowance success consumes units and recognizes value (312 Ixis per Solo voiceover)", async () => {
    const { svc, repo, customer, admin, wsA, voice } = await setup();
    await svc.adminGrantAllowance(admin, wsA.id, 8, "solo_monthly", "manual test grant");
    const v = await voice("demo-najdi-business");
    const { purchase } = await svc.purchase(customer, wsA.id, v.id, req(), { funding: "allowance", idempotencyKey: "allw-0001" });
    expect(purchase.status).toBe("fulfilled");
    expect((await repo.one("voice_workspaces", { id: wsA.id }))!.allowance_voiceovers).toBe(7);
    expect((await svc.creatorBalances(purchase.creator_id)).pending).toBe(Math.floor((312 - 15) * 0.6));
    expect((await svc.reconcile(null)).ok).toBe(true);
  });
});

describe("pausing / suspension", () => {
  it("blocks new auditions, quotes and purchases; queued jobs are released; earlier grants keep their terms", async () => {
    const { svc, repo, customer, creator, admin, wsA, voice, wallet } = await setup();
    const v = await voice("demo-najdi-business");
    const done = await svc.purchase(customer, wsA.id, v.id, req(), { funding: "wallet", idempotencyKey: "pause-001" });
    const queued = await svc.purchase(customer, wsA.id, v.id, req("Second script."), { funding: "wallet", idempotencyKey: "pause-002", runInline: false });
    expect(queued.purchase.status).toBe("payment_held");
    await svc.creatorPause(creator, v.id);
    expect(await code(svc.quote(customer, wsA.id, v.id, req()))).toBe("voice_unavailable");
    expect(await code(svc.purchase(customer, wsA.id, v.id, req(), { funding: "wallet", idempotencyKey: "pause-003" }))).toBe("voice_unavailable");
    expect(await code(svc.audition(customer, wsA.id, v.id, "hello"))).toBe("voice_unavailable");
    expect((await repo.one("voice_purchases", { id: queued.purchase.id }))!.status).toBe("cancelled");
    expect(wallet.balance(customer.walletOwner)).toBe(4500);
    expect((await repo.one("voice_purchases", { id: done.purchase.id }))!.status).toBe("fulfilled");
    expect(await code(svc.downloadUrl(customer, done.purchase.id))).toBe("ok");
    await svc.creatorResume(creator, v.id);
    await svc.adminSuspend(admin, v.id, "report under review");
    expect(await code(svc.quote(customer, wsA.id, v.id, req()))).toBe("voice_unavailable");
  });
  it("permission recheck blocks a queued job if consent is revoked", async () => {
    const { svc, repo, customer, creator, wsA, voice, wallet } = await setup();
    const v = await voice("demo-najdi-business");
    const q = await svc.purchase(customer, wsA.id, v.id, req(), { funding: "wallet", idempotencyKey: "recheck-1", runInline: false });
    await repo.update("voice_consents", { voice_id: v.id, kind: "cloning" }, { revoked_at: new Date().toISOString() });
    const job = await svc.runJob((await repo.one("voice_jobs", { purchase_id: q.purchase.id }))!.id);
    expect(job.status).toBe("blocked");
    expect(wallet.balance(customer.walletOwner)).toBe(5000);
    void creator;
  });
});

describe("terms snapshot", () => {
  it("stays frozen after the creator and admin change settings", async () => {
    const { svc, repo, customer, creator, admin, wsA, voice } = await setup();
    const v = await voice("demo-najdi-business");
    const { purchase } = await svc.purchase(customer, wsA.id, v.id, req(), { funding: "wallet", idempotencyKey: "frozen-01" });
    const before = JSON.stringify(purchase.terms_snapshot);
    await svc.setPermissions(creator, v.id, { publication: false, max_term_months: 3 });
    const cfg = await svc.pricing();
    const { version: _v, active: _a, created_at: _c, ...rest } = cfg; void _v; void _a; void _c;
    await svc.adminSetPricing(admin, { ...rest, payg_base_ixis: 900 });
    const after = (await repo.one("voice_purchases", { id: purchase.id }))!;
    expect(JSON.stringify(after.terms_snapshot)).toBe(before);
    expect(termsHash(after.terms_snapshot)).toBe(after.terms_hash);
    expect(after.terms_snapshot.price.ixis).toBe(500);
    expect(after.terms_snapshot.voice.permission_version).toBe(1);
    expect(after.terms_snapshot.creator_compensation.creator_share_bps).toBe(6000);
    await expect(repo.update("voice_purchases", { id: purchase.id }, { price_ixis: 1 })).rejects.toThrow(/immutable/);
    expect(await code(svc.quote(customer, wsA.id, v.id, req()))).toBe("publication_not_allowed"); // new quotes use the new settings
    expect((await svc.quote(customer, wsA.id, v.id, req("hi", { publication: false, term_months: 3 }))).priceIxis).toBe(900);
  });
});

describe("approval-required licensing", () => {
  it("cannot be bypassed", async () => {
    const { svc, repo, customer, admin, wsA, voice, wallet } = await setup();
    const v = await voice("demo-egyptian-storyteller");
    const { purchase } = await svc.purchase(customer, wsA.id, v.id, req("Hello from Cairo. أهلاً من القاهرة.", { declared_use: "podcast" }), { funding: "wallet", idempotencyKey: "appr-0001" });
    expect(purchase.status).toBe("pending_approval");
    expect(purchase.wallet_reservation_id).toBeNull();
    expect(wallet.balance(customer.walletOwner)).toBe(5000);
    expect(await code(svc.payApproved(customer, purchase.id))).toBe("approval_pending");
    await repo.update("voice_purchases", { id: purchase.id }, { status: "approved" }); // forged status flip
    expect(await code(svc.payApproved(customer, purchase.id))).toBe("approval_required");
    await repo.update("voice_purchases", { id: purchase.id }, { status: "pending_approval" });
    const a = (await repo.one("voice_approval_requests", { purchase_id: purchase.id }))!;
    const otherCreator = { userId: (await repo.one("voice_creators", { handle: "demo-creator-1" }))!.user_id, email: "x@x", walletOwner: "x", isAdmin: false };
    expect(await code(svc.decideApproval(otherCreator, a.id, true, "not mine"))).toBe("not_found");
    expect(await code(svc.decideApproval(admin, a.id, true, "admin"))).toBe("not_creator");
    const owner = { userId: (await repo.one("voice_creators", { id: v.creator_id }))!.user_id, email: "o@o", walletOwner: "o", isAdmin: false };
    await svc.decideApproval(owner, a.id, true, "fine");
    const paid = await svc.payApproved(customer, purchase.id);
    expect(paid.purchase.status).toBe("fulfilled");
  });
});

describe("refunds", () => {
  it("post correct reversing ledger lines and Lyrixis credit", async () => {
    const { svc, customer, admin, wsA, voice, repo } = await setup();
    const v = await voice("demo-najdi-business");
    const { purchase } = await svc.purchase(customer, wsA.id, v.id, req(), { funding: "wallet", idempotencyKey: "refund-01" });
    expect(await code(svc.adminRefund(customer, purchase.id, "x"))).toBe("admin_only");
    await svc.adminRefund(admin, purchase.id, "customer complaint");
    await svc.adminRefund(admin, purchase.id, "double click"); // idempotent
    expect((await svc.creatorBalances(purchase.creator_id)).pending).toBe(0);
    expect(await svc.accountBalance("apixis_platform_fee_payable")).toBe(0);
    expect(await svc.accountBalance("lyrixis_voice_refunds")).toBe(190);
    expect(await svc.accountBalance("lyrixis_voice_revenue")).toBe(-190);
    expect(await svc.accountBalance(`workspace:${wsA.id}:credit`)).toBe(-500);
    expect((await repo.one("voice_workspaces", { id: wsA.id }))!.credit_ixis).toBe(500);
    expect((await repo.one("voice_purchases", { id: purchase.id }))!.status).toBe("refunded");
    expect((await svc.reconcile(null)).ok).toBe(true);
  });
  it("claws back from available earnings when already released (adjustment line)", async () => {
    let t = Date.parse("2026-10-04T12:00:00Z");
    const { svc, customer, admin, wsA, voice } = await setup({ now: () => new Date(t) });
    const v = await voice("demo-najdi-business");
    const { purchase } = await svc.purchase(customer, wsA.id, v.id, req(), { funding: "wallet", idempotencyKey: "refund-02" });
    expect((await svc.releaseMaturedEarnings()).released).toBe(0);
    t += 15 * 86_400_000;
    // ledger tx timestamps use wall clock; force maturity by checking with a far-future clock
    t = Date.now() + 15 * 86_400_000;
    expect((await svc.releaseMaturedEarnings()).released).toBe(285);
    expect((await svc.releaseMaturedEarnings()).released).toBe(0);
    expect(await svc.creatorBalances(purchase.creator_id)).toEqual({ pending: 0, available: 285, paid: 0 });
    await svc.adminRefund(admin, purchase.id, "chargeback-like");
    expect(await svc.creatorBalances(purchase.creator_id)).toEqual({ pending: 0, available: 0, paid: 0 });
    const dash = await svc.creatorDashboard({ ...customer, userId: (await svc.repo.one("voice_creators", { id: purchase.creator_id }))!.user_id });
    expect(dash?.adjustments.some((a) => a.kind === "adjustment" && a.amount === -285)).toBe(true);
    expect(await code(svc.requestPayout())).toBe("payout_blocked");
  });
});

describe("Arabic scripts", () => {
  it("round-trip NFC, hash stable across forms, mixed RTL/LTR", async () => {
    const { svc, repo, customer, wsA, voice } = await setup();
    const decomposed = "مرحبًا بكم في Demo Co. — أفضل خدمة ٢٠٢٦".normalize("NFD");
    expect(scriptHash(decomposed)).toBe(scriptHash(decomposed.normalize("NFC")));
    const v = await voice("demo-bilingual-gulf-en");
    const { purchase } = await svc.purchase(customer, wsA.id, v.id, req(decomposed, { declared_use: "ads" }), { funding: "wallet", idempotencyKey: "arabic-01" });
    const script = (await repo.one("voice_scripts", { id: purchase.script_id! }))!;
    expect(script.body).toBe(normalizeScript(decomposed));
    expect(script.body).toBe("مرحبًا بكم في Demo Co. — أفضل خدمة ٢٠٢٦".normalize("NFC"));
    expect(script.language).toBe("ar");
    expect(purchase.terms_snapshot.script_hash).toBe(script.script_hash);
    expect(purchase.status).toBe("fulfilled");
    expect(estimateSeconds("مرحبا بكم")).toBeGreaterThan(0);
    expect(applyPronunciations("زوروا ليريكسيس اليوم، Lyrixis!", [{ term: "Lyrixis", say_as: "ليريكسيس" }])).toBe("زوروا ليريكسيس اليوم، ليريكسيس!");
  });
});

describe("auditions", () => {
  it("15s max, 5 free per business per day, then 25 Ixis via Wallet", async () => {
    const { svc, customer, wsA, voice, wallet } = await setup();
    const v = await voice("demo-emirati-warm");
    expect(await code(svc.audition(customer, wsA.id, v.id, "كلمة ".repeat(60)))).toBe("audition_too_long");
    for (let i = 0; i < 5; i++) expect((await svc.audition(customer, wsA.id, v.id, "مرحبا")).free).toBe(true);
    const paid = await svc.audition(customer, wsA.id, v.id, "مرحبا");
    expect(paid.free).toBe(false);
    expect(paid.charged).toBe(25);
    expect(wallet.balance(customer.walletOwner)).toBe(4975);
    expect(paid.isDemo).toBe(true);
  });
});

describe("invite-only launch", () => {
  it("only admins and invited users get in", async () => {
    const { svc, repo, admin, wsA, voice } = await setup({ inviteOnly: true });
    const stranger = await newUser(repo, "s1");
    const ws = await svc.ensureWorkspace(stranger);
    const v = await voice("demo-najdi-business");
    expect(await code(svc.quote(stranger, ws.id, v.id, req()))).toBe("invite_only");
    expect(await code(svc.becomeCreator(stranger, { handle: "stranger", display_name: "Stranger", adult: true, accept_creator_terms: true }))).toBe("invite_only");
    await svc.adminInvite(admin, stranger.email, "both");
    expect(await code(svc.quote(stranger, ws.id, v.id, req()))).toBe("ok");
    expect(await svc.hasAccess({ ...admin, isAdmin: false, email: "awad@apixis.dev" })).toBe(true);
    void wsA;
  });
});

describe("custom human recordings", () => {
  it("min 2,500 Ixis, 1 revision, Lyrixis keeps 20% after the 5% fee", async () => {
    const { svc, repo, customer, creator, wsA, voice } = await setup();
    const v = await voice("demo-najdi-business");
    const r = await svc.requestCustom(customer, wsA.id, v.id, "30-second brand intro in Najdi Arabic", "ads");
    expect(await code(svc.quoteCustom(creator, r.id, 2000))).toBe("quote_too_low");
    await svc.quoteCustom(creator, r.id, 3000);
    await svc.acceptCustomQuote(customer, r.id);
    await svc.deliverCustom(creator, r.id, { mime: "audio/wav", body: wav(3) });
    await svc.customRevisionOrAccept(customer, r.id, "revise");
    await svc.deliverCustom(creator, r.id, { mime: "audio/wav", body: wav(3) });
    expect(await code(svc.customRevisionOrAccept(customer, r.id, "revise"))).toBe("no_revisions_left");
    await svc.customRevisionOrAccept(customer, r.id, "accept");
    const creatorRow = (await repo.one("voice_creators", { id: v.creator_id }))!;
    expect((await svc.creatorBalances(creatorRow.id)).pending).toBe(Math.floor((3000 - 150) * 0.8));
  });
});

describe("uploads, signing, metrics", () => {
  it("validates real audio types and sizes", () => {
    expect(validateUpload("sample", "audio/wav", wav(2)).mime).toBe("audio/wav");
    expect(() => validateUpload("sample", "audio/wav", new TextEncoder().encode("<html>not audio</html>"))).toThrow(/Allowed/);
    expect(() => validateUpload("sample", "audio/mpeg", wav(2))).toThrow(/match/);
    expect(() => assertAllowedName("الشيخ فلان")).toThrow();
  });
  it("signed URLs expire and can't be forged", () => {
    const now = Date.now();
    const u = new URL(signFileUrl("b", "p/x.wav", 300, now), "http://x");
    const [b, p, e, s] = ["b", "p", "e", "s"].map((k) => u.searchParams.get(k)!);
    expect(verifyFileUrl(b, p, e, s, now)).toBe(true);
    expect(verifyFileUrl(b, "p/other.wav", e, s, now)).toBe(false);
    expect(verifyFileUrl(b, p, e, s, now + 301_000)).toBe(false);
  });
  it("metrics are aggregate-only (no scripts, emails or creator names)", async () => {
    const { svc, customer, wsA, voice } = await setup();
    await svc.purchase(customer, wsA.id, (await voice("demo-najdi-business")).id, req("SECRET SCRIPT"), { funding: "wallet", idempotencyKey: "metric-01" });
    const m = JSON.stringify(await svc.metrics());
    expect(m).not.toMatch(/SECRET|@|Demo creator|demo-najdi/);
  });
  it("public voice objects never carry provider refs", async () => {
    const { svc } = await setup();
    const cat = JSON.stringify(await svc.catalog());
    expect(cat).not.toMatch(/provider_voice_ref|demo:demo-/);
    expect(JSON.parse(cat).every((e: { voice: { earned_verification: unknown } }) => e.voice.earned_verification === null)).toBe(true);
  });
});

describe("retention", () => {
  it("retire deletes training audio; sweep empties old scripts but keeps hashes", async () => {
    let t = Date.now();
    const { svc, repo, customer, wsA, voice, creator } = await setup({ now: () => new Date(t) });
    const v = await voice("demo-najdi-business");
    const { purchase } = await svc.purchase(customer, wsA.id, v.id, req(), { funding: "wallet", idempotencyKey: "retain-01" });
    await svc.uploadTraining(creator, v.id, { mime: "audio/wav", body: wav(40) });
    t += 181 * 86_400_000;
    const r = await svc.purgeExpired();
    expect(r.scripts).toBe(1);
    const sc = (await repo.one("voice_scripts", { id: purchase.script_id! }))!;
    expect(sc.body).toBe("");
    expect(sc.script_hash).toBe(purchase.terms_snapshot.script_hash);
    await svc.creatorRetire(creator, v.id);
    const tr = await repo.find("voice_training_uploads", { voice_id: v.id });
    expect(tr.every((x) => x.deleted_at)).toBe(true);
    expect(await repo.getObject(tr[0].storage_bucket, tr[0].storage_path)).toBeNull();
  });
});
