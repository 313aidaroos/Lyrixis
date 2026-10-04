// Partner API (Socixis). Contract: docs/voices/SOCIXIS_INTEGRATION.md
import { getVoices } from "@/lib/voices/context";
import { handlePartner } from "@/lib/voices/partner-api";
import { guarded, json } from "@/lib/voices/route-helpers";

export const dynamic = "force-dynamic";

async function handle(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return guarded(async () => {
    const { path } = await ctx.params;
    let body: unknown = null;
    if (req.method === "POST") { try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); } }
    const r = await handlePartner(await getVoices(), { method: req.method, path, headers: req.headers, body, query: new URL(req.url).searchParams });
    return json(r.body, r.status);
  });
}
export const GET = handle;
export const POST = handle;
