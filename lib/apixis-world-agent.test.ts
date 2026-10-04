import { describe, expect, it } from "vitest";
import { APIXIS_ENTER_CLIENTS, enterApixisUrl } from "./apixis-world";
import { ensureWorldAgent, needsProvision, welcomeSeenMetadata, worldAgentView } from "./apixis-world-agent";

const ROLLOUT = "2026-09-28T07:30:00.000Z";
const NEW = "2026-09-28T08:00:00.000Z";
const user = { id: "u1", email: "new@example.com", created_at: NEW, email_confirmed_at: NEW, app_metadata: { provider: "email" } };
const ok = { ok: true as const, created: true, starterGrantedNow: true, starterIxis: 1000, agent: { id: "a1", name: "New", status: "active", ixix_balance: 1000 }, enterUrl: "" };

describe("Apixis world agent (Lyrixis)", () => {
  it("enters via www.apixis.dev/enter?from=lyrixis", () => {
    expect(enterApixisUrl("lyrixis")).toBe("https://www.apixis.dev/enter?from=lyrixis");
    expect(APIXIS_ENTER_CLIENTS.length).toBe(15);
  });
  it("provisions a new verified account once; never older or unverified accounts", async () => {
    const calls: unknown[] = [];
    const saved: Record<string, unknown>[] = [];
    const deps = { client: "lyrixis", provision: async (i: unknown) => { calls.push(i); return ok; }, saveAppMetadata: async (_: string, m: Record<string, unknown>) => { saved.push(m); } };
    const view = await ensureWorldAgent(user, deps, ROLLOUT);
    expect(view).toMatchObject({ status: "ready", showWelcome: true, agentName: "New" });
    await ensureWorldAgent({ ...user, app_metadata: saved[0] }, deps, ROLLOUT);
    expect(calls).toHaveLength(1);
    expect(needsProvision({ ...user, created_at: "2026-09-27T00:00:00.000Z" }, ROLLOUT)).toBe(false);
    expect(needsProvision({ ...user, email_confirmed_at: null }, ROLLOUT)).toBe(false);
  });
  it("failed provision retries later; dismiss hides the card", async () => {
    const v = await ensureWorldAgent(user, { client: "lyrixis", provision: async () => ({ ok: false as const, error: "x" }), saveAppMetadata: async () => {} }, ROLLOUT);
    expect(v.status).toBe("invite");
    expect(worldAgentView({ ...user, app_metadata: welcomeSeenMetadata({}, "dismiss") }, ROLLOUT).showWelcome).toBe(false);
  });
});
