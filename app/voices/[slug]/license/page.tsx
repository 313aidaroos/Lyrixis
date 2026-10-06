import Link from "next/link";
import { notFound } from "next/navigation";
import { LicenseFlow } from "@/components/voices/LicenseFlow";
import { getActor, getVoices, voicesOpen } from "@/lib/voices/context";
import { CHANNELS, LEGAL_REVIEW_NOTE, TERRITORIES, USES } from "@/lib/voices/config";
import { VoicesError } from "@/lib/voices/errors";

export default async function LicensePage({ params }: { params: Promise<{ slug: string }> }) {
  if (!voicesOpen()) return null; // Voices closed: the layout shows "Opening soon"; skip DB reads.
  const { slug } = await params;
  const [svc, actor] = await Promise.all([getVoices(), getActor()]);
  let d;
  try { d = await svc.voiceBySlug(slug, actor); } catch (e) { if (e instanceof VoicesError && e.status === 404) notFound(); throw e; }
  const p = d.permissions;
  if (d.voice.status !== "active" || !p.paid_generation) return <div className="card p-8">This voice isn&apos;t available for new licenses. <Link className="text-cyan" href="/voices">Browse voices</Link></div>;
  const uses = USES.filter((u) => !p.blocked_uses.includes(u.id) && (!p.allowed_uses.length || p.allowed_uses.includes(u.id))).map((u) => ({ value: u.id, label: u.label }));
  const channels = CHANNELS.filter((c) => !p.allowed_channels.length || p.allowed_channels.includes(c)).map((c) => ({ value: c, label: c.replace(/_/g, " ") }));
  const territories = TERRITORIES.filter((t) => p.allowed_territories.includes("worldwide") || p.allowed_territories.includes(t)).map((t) => ({ value: t, label: t.toUpperCase() }));
  return (
    <div className="space-y-6">
      <p className="text-sm"><Link href={`/voices/${slug}`} className="text-cyan">← {d.voice.display_name}</Link></p>
      <h1 className="font-display text-3xl font-extrabold">License this voice</h1>
      {!actor ? <div className="card p-6">Sign in with your Apixis ID to license a voice. <Link href={`/login?next=/voices/${slug}/license`} className="text-cyan">Sign in</Link></div>
        : <LicenseFlow voiceId={d.voice.id} voiceName={d.voice.display_name} uses={uses} channels={channels} territories={territories} maxTerm={p.max_term_months} publicationAllowed={p.publication} approvalRequired={d.voice.licensing_mode === "approval_required"} legalNote={LEGAL_REVIEW_NOTE} />}
    </div>
  );
}
