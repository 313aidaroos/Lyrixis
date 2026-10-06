import { getActor, getVoices } from "@/lib/voices/context";
import { readBody, runAction } from "@/lib/voices/http";
import { clientIp, guarded, json, softLimit } from "@/lib/voices/route-helpers";
import { createHash } from "node:crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  return guarded(async () => {
    const { action } = await params;
    const ip = clientIp(req);
    if (!softLimit(`a:${ip}`)) return json({ error: "rate_limited", message: "Slow down a little." }, 429);
    const [svc, actor, body] = await Promise.all([getVoices(), getActor(), readBody(req)]);
    const ipHash = createHash("sha256").update(`lyxv-ip:${ip}`).digest("hex").slice(0, 32);
    return json(await runAction({ svc, actor, ip: ipHash }, action, body));
  });
}
