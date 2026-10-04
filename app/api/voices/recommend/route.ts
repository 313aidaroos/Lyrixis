// Read-only voice recommendations for Cixy (see docs/voices/CIXY_WIRING.md). No writes, no PII.
import { getVoices } from "@/lib/voices/context";
import { guarded, json } from "@/lib/voices/route-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return guarded(async () => {
    const q = new URL(req.url).searchParams;
    const svc = await getVoices();
    const limit = Number(q.get("limit") ?? 5);
    const voices = await svc.recommend({ text: q.get("text")?.slice(0, 500) ?? undefined, language: q.get("language") ?? undefined, dialect: q.get("dialect") ?? undefined, use: q.get("use") ?? undefined, tone: q.get("tone") ?? undefined, limit: Number.isFinite(limit) ? limit : 5 });
    return json({ voices, note: "Recommendations only. Licensing happens on the voice page with a declared use and receipt." });
  });
}
