// Lyrixis Voices catalog (replaces the 9/22 "voice shelf" skeleton). Public, read-only.
import { getVoices } from "@/lib/voices/context";
import { guarded, json } from "@/lib/voices/route-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return guarded(async () => {
    const q = new URL(req.url).searchParams;
    const svc = await getVoices();
    const voices = await svc.catalog({ q: q.get("q") ?? undefined, language: q.get("language") ?? undefined, dialect: q.get("dialect") ?? undefined, tone: q.get("tone") ?? undefined, use: q.get("use") ?? undefined });
    return json({ voices, mode: svc.mode });
  });
}
