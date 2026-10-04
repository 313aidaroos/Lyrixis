// Worker tick: runs queued generation jobs, reconciles payments, releases matured earnings.
// Protected by CRON_SECRET (Vercel Cron sends it as a Bearer token).
import { getVoices } from "@/lib/voices/context";
import { guarded, json } from "@/lib/voices/route-helpers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function tick(req: Request) {
  return guarded(async () => {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return json({ error: "unauthorized" }, 401);
    const svc = await getVoices();
    const ran = await svc.runQueued(5);
    const rec = await svc.reconcile(null);
    const rel = await svc.releaseMaturedEarnings();
    const purged = await svc.purgeExpired();
    return json({ ran: ran.length, reconcile: { ok: rec.ok, fixed: rec.fixed.length, issues: rec.issues.length }, released: rel.released, purged });
  });
}
export const GET = tick;
export const POST = tick;
