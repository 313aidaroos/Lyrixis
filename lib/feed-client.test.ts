// Tests for feed-client/api.ts against the FEED_API.md shapes (mock fetch, no network).
import { test } from "vitest";
import assert from "node:assert/strict";
import { createFeedClient, FeedError, feedErrorText } from "@/feed-client/api";

type Call = { url: string; init: RequestInit };
function mock(routes: Array<(c: Call) => Response | undefined>) {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string, init: RequestInit = {}) => {
    const c = { url: String(url), init }; calls.push(c);
    for (const r of routes) { const res = r(c); if (res) return res; }
    return new Response(JSON.stringify({ ok: false, error: "not_found" }), { status: 404 });
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { "content-type": "application/json" } });
const post = { id: "p1", type: "text", status: "live", caption: "hi #fun", hashtags: ["fun"], media: null, source_site: "socixis", source_site_name: "Socixis", posted_by: "self", ai_label: null, author: { id: "a", username: "awad", display_name: "Awad", avatar_url: null }, counts: { likes: 0, comments: 0, shares: 0, saves: 0, views: 0, tips_ixis: 0 }, boosted_until: null, created_at: "2026-10-04T00:00:00Z", published_at: "2026-10-04T00:00:00Z" };

test("anonymous for-you read: no auth header, client header + cursor/limit", async () => {
  const m = mock([(c) => (c.url.endsWith("/api/feed-session") ? json({ ok: false, error: "unauthorized" }, 401) : undefined),
    (c) => (c.url.includes("/for-you") ? json({ ok: true, items: [post], next_cursor: "c2" }) : undefined)]);
  const fc = createFeedClient({ client: "socixis", sessionUrl: "/api/feed-session", fetchImpl: m.fetchImpl });
  const page = await fc.feed({ kind: "for-you" }, "c1", 5);
  assert.equal(page.items[0]?.source_site_name, "Socixis");
  assert.equal(page.next_cursor, "c2");
  const call = m.calls.find((c) => c.url.includes("/for-you"))!;
  assert.match(call.url, /^https:\/\/www\.apixis\.dev\/api\/feed\/for-you\?cursor=c1&limit=5$/);
  const h = call.init.headers as Record<string, string>;
  assert.equal(h["x-apixis-client"], "socixis");
  assert.equal(h.authorization, undefined);
});

test("signed-in calls carry the feed token and refresh once on token_expired", async () => {
  let mint = 0, likes = 0;
  const m = mock([(c) => (c.url.endsWith("/api/feed-session") ? json({ ok: true, token: `fdt_${++mint}`, expires_at: new Date(Date.now() + 3600e3).toISOString(), profile: { id: "a", username: "awad" } }) : undefined),
    (c) => {
      if (!c.url.endsWith("/posts/p1/like")) return undefined;
      likes++;
      const h = c.init.headers as Record<string, string>;
      return h.authorization === "Bearer fdt_1" ? json({ ok: false, error: "token_expired" }, 401) : json({ ok: true, liked: true, likes: 4 });
    }]);
  const fc = createFeedClient({ client: "renoxis", sessionUrl: "/api/feed-session", fetchImpl: m.fetchImpl });
  const r = await fc.like("p1");
  assert.deepEqual([r.liked, r.likes, mint, likes], [true, 4, 2, 2]);
  assert.equal(fc.session().profile?.username, "awad");
});

test("tip sends a preset amount + idempotency key; wallet errors map to kind text", async () => {
  let body: Record<string, unknown> = {};
  const m = mock([(c) => (c.url.endsWith("/api/feed-session") ? json({ ok: true, token: "fdt_x", expires_at: new Date(Date.now() + 3600e3).toISOString(), profile: { id: "b" } }) : undefined),
    (c) => { if (!c.url.endsWith("/posts/p1/tip")) return undefined; body = JSON.parse(String(c.init.body)); return json({ ok: false, error: "insufficient_ixis", needed: 100, buy_url: "x" }, 402); }]);
  const fc = createFeedClient({ client: "socixis", sessionUrl: "/api/feed-session", fetchImpl: m.fetchImpl });
  await assert.rejects(fc.tip("p1", 100), (e: unknown) => e instanceof FeedError && e.status === 402 && e.data.needed === 100);
  assert.equal(body.amount, 100);
  assert.match(String(body.idempotency_key), /^tip-/);
  assert.match(feedErrorText(new FeedError(503, "wallet_min_order", "")), /Small tips are coming soon/);
});

test("createPost defaults source_site to the calling client and posted_by self", async () => {
  let body: Record<string, unknown> = {};
  const m = mock([(c) => (c.url.endsWith("/api/feed-session") ? json({ ok: true, token: "fdt_x", expires_at: new Date(Date.now() + 3600e3).toISOString(), profile: { id: "a" } }) : undefined),
    (c) => { if (!c.url.endsWith("/api/feed/posts")) return undefined; body = JSON.parse(String(c.init.body)); return json({ ok: true, post: { ...post, status: "held" } }, 201); }]);
  const fc = createFeedClient({ client: "halaxis", sessionUrl: "/api/feed-session", fetchImpl: m.fetchImpl });
  const p = await fc.createPost({ type: "text", caption: "hello" });
  assert.equal(p.status, "held");
  assert.deepEqual([body.source_site, body.posted_by, body.type], ["halaxis", "self", "text"]);
});

test("search and trending paths", async () => {
  const m = mock([(c) => (c.url.endsWith("/api/feed-session") ? json({ ok: false }, 401) : undefined),
    (c) => (c.url.includes("/search?") ? json({ ok: true, items: [], next_cursor: null }) : undefined),
    (c) => (c.url.includes("/trending") ? json({ ok: true, items: [{ tag: "fun", posts_24h: 3, score: 1 }] }) : undefined)]);
  const fc = createFeedClient({ client: "socixis", sessionUrl: "/api/feed-session", fetchImpl: m.fetchImpl });
  await fc.searchHashtags("#Fun");
  assert.ok(m.calls.some((c) => c.url.includes("/search?q=Fun&type=hashtags")));
  const t = await fc.trending();
  assert.equal(t[0]?.tag, "fun");
});
