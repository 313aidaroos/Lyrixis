import { NextResponse } from "next/server";
import { toErrorJson } from "./http";
import { voicesOpen } from "./context";

export const closed = () => NextResponse.json({ error: "not_found" }, { status: 404 });

export function json(data: unknown, status = 200) {
  return NextResponse.json(data ?? { ok: true }, { status, headers: { "cache-control": "no-store" } });
}

export async function guarded(fn: () => Promise<Response>): Promise<Response> {
  if (!voicesOpen()) return closed();
  try { return await fn(); } catch (e) { const { status, body } = toErrorJson(e); return json(body, status); }
}

const hits = new Map<string, { n: number; reset: number }>();
/** Best-effort per-instance limiter for POSTs (service has its own audition/business limits). */
export function softLimit(key: string, max = 60, windowMs = 60_000) {
  const now = Date.now(); const h = hits.get(key);
  if (!h || h.reset < now) { hits.set(key, { n: 1, reset: now + windowMs }); return true; }
  h.n += 1; return h.n <= max;
}

export function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
}
