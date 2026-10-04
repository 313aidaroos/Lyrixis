// Serves demo-mode (in-memory) audio behind expiring HMAC links. Live mode uses Supabase signed URLs.
import { getVoices, voicesMode } from "@/lib/voices/context";
import { verifyFileUrl } from "@/lib/voices/signing";
import { closed, guarded } from "@/lib/voices/route-helpers";
import type { MemoryRepo } from "@/lib/voices/memory-repo";
import { demoWav } from "@/lib/voices/providers/demo";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return guarded(async () => {
    if (voicesMode() !== "demo") return closed();
    const q = new URL(req.url).searchParams;
    const [b, p, e, s] = ["b", "p", "e", "s"].map((k) => q.get(k) ?? "");
    if (!verifyFileUrl(b, p, e, s)) return new Response("Link expired", { status: 403 });
    // Demo state is per serverless instance; a validly signed link from another instance gets a stand-in demo tone.
    const obj = (await ((await getVoices()).repo as MemoryRepo).getObject(b, p)) ?? { body: demoWav("demo", 3), mime: "audio/wav" };
    return new Response(Buffer.from(obj.body), { headers: { "content-type": obj.mime, "cache-control": "private, max-age=60", "content-disposition": b === "voices-outputs-private" ? `attachment; filename="lyrixis-voice.wav"` : "inline", "x-content-type-options": "nosniff" } });
  });
}
