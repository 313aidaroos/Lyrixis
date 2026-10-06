import Link from "next/link";
import { notFound } from "next/navigation";
import { Audition } from "@/components/voices/Audition";
import { ActionForm, SaveCompare, TrackRecent } from "@/components/voices/ui";
import { Pill, VerificationBadge } from "@/components/voices/server";
import { getActor, getVoices, voicesOpen } from "@/lib/voices/context";
import { USES, dialectLabel } from "@/lib/voices/config";
import { VoicesError } from "@/lib/voices/errors";

async function load(slug: string) {
  const [svc, actor] = await Promise.all([getVoices(), getActor()]);
  try { return { d: await svc.voiceBySlug(slug, actor), svc, actor }; } catch (e) { if (e instanceof VoicesError && e.status === 404) notFound(); throw e; }
}

export default async function VoicePage({ params }: { params: Promise<{ slug: string }> }) {
  if (!voicesOpen()) return null; // Voices closed: the layout shows "Opening soon"; skip DB reads.
  const { slug } = await params;
  const { d } = await load(slug);
  const { voice: v, creator: c, permissions: p, samples, pricing } = d;
  const usable = v.status === "active";
  return (
    <div className="space-y-8">
      <TrackRecent slug={v.slug} />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div className="flex flex-wrap gap-2">{v.is_demo && <Pill tone="amber">Demo voice · fictional</Pill>}<VerificationBadge status={v.earned_verification} />{v.dialect_review_status === "approved" ? <Pill tone="green">Dialect reviewed by a native speaker</Pill> : <Pill>Dialect review pending</Pill>}</div>
          <h1 className="mt-3 font-display text-4xl font-extrabold">{v.display_name}</h1>
          {v.display_name_ar && <p dir="rtl" lang="ar" className="mt-1 text-xl text-ink-2">{v.display_name_ar}</p>}
          <p dir="auto" className="mt-3 text-ink-2">{v.description}</p>
          {v.description_ar && <p dir="rtl" lang="ar" className="mt-1 text-ink-2">{v.description_ar}</p>}
          <p className="mt-3 text-sm text-ink-3">By <Link href={`/voices/creators/${c.handle}`} className="text-cyan hover:underline">{c.display_name}</Link></p>
          <div className="mt-3 flex flex-wrap gap-1.5">{v.dialects.map((x) => <Pill key={x} tone="cyan">{dialectLabel(x)}</Pill>)}{v.tones.map((t) => <Pill key={t}>{t}</Pill>)}</div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <SaveCompare slug={v.slug} />
          {!usable && <Pill tone="amber">Not available for new licenses ({v.status.replace(/_/g, " ")})</Pill>}
          {usable && p.paid_generation && <Link href={`/voices/${v.slug}/license`} className="btn-primary px-5 py-2.5">Use this voice</Link>}
          <p className="text-xs text-ink-3">from {pricing.payg_base_ixis} Ixis / {pricing.payg_base_seconds}s{pricing.illustrative ? " (illustrative)" : ""}</p>
        </div>
      </header>
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4 p-5">
          <h2 className="font-display text-lg font-bold">Samples</h2>
          {samples.length === 0 && <p className="text-sm text-ink-3">No approved samples yet.</p>}
          {samples.map((s) => (
            <div key={s.id} className="space-y-1">
              <p className="text-sm text-ink-2">{s.title} {s.is_demo && <span className="text-xs text-amber-200">(demo tone, not a real voice)</span>} {!s.approved && <span className="text-xs text-ink-3">(awaiting approval — only you/admins see this)</span>}</p>
              {s.url ? <audio controls preload="none" src={s.url} className="w-full" aria-label={`Sample: ${s.title}`} /> : <p className="text-xs text-ink-3">Sample playback is off for this voice.</p>}
              {s.transcript && <p dir="auto" className="text-xs text-ink-3">{s.transcript}</p>}
            </div>
          ))}
        </div>
        {usable && p.auditions ? <Audition voiceId={v.id} freePerDay={pricing.free_auditions_per_day} paidIxis={pricing.audition_ixis} maxSeconds={pricing.audition_max_seconds} /> : <div className="card p-5 text-sm text-ink-3">Auditions are off for this voice.</div>}
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5 text-sm text-ink-2">
          <h2 className="font-display text-lg font-bold text-ink">What the creator allows</h2>
          <ul className="mt-3 space-y-1">
            <li>Uses: {p.allowed_uses.length ? p.allowed_uses.map((u) => USES.find((x) => x.id === u)?.label ?? u).join(", ") : "any non-blocked use"}</li>
            <li>Channels: {p.allowed_channels.length ? p.allowed_channels.join(", ") : "any"}</li>
            <li>Territories: {p.allowed_territories.join(", ")}</li>
            <li>Published use: {p.publication ? "yes" : "no — internal only"}</li>
            <li>Max term: {p.max_term_months} months · non-exclusive</li>
            <li>{v.licensing_mode === "approval_required" ? "The creator approves each script before payment." : "Instant licensing."}</li>
            <li className="text-ink-3">Never allowed: political, adult, impersonation, fraud, hate.</li>
          </ul>
        </div>
        <div className="card space-y-3 p-5">
          <h2 className="font-display text-lg font-bold">Hire the real person</h2>
          {p.custom_recordings && c.hire_enabled ? (<>
            <p className="text-sm text-ink-2">Ask {c.display_name} to record your script themselves. They quote a price (min {pricing.custom_min_ixis.toLocaleString()} Ixis, {pricing.custom_included_revisions} revision included).</p>
            <ActionForm action="custom.request" extra={{ voiceId: v.id }} submit="Send request" fields={[{ name: "brief", label: "Brief", type: "textarea", required: true, dir: "auto", placeholder: "Length, tone, deadline, script…" }, { name: "declaredUse", label: "Use", type: "select", options: USES.map((u) => ({ value: u.id, label: u.label })) }]} />
          </>) : <p className="text-sm text-ink-3">This creator isn&apos;t taking custom recordings right now.</p>}
        </div>
      </section>
      <details className="card p-5 text-sm">
        <summary className="cursor-pointer text-ink-2">Report this voice (impersonation, missing consent, misuse)</summary>
        <div className="mt-3"><ActionForm action="report" extra={{ voiceId: v.id }} submit="Send report" fields={[{ name: "reason", label: "Reason", type: "select", options: [{ value: "impersonation", label: "Impersonates someone" }, { value: "no_consent", label: "Used without consent" }, { value: "misuse", label: "Misuse" }, { value: "quality", label: "Quality / wrong dialect" }, { value: "other", label: "Other" }] }, { name: "details", label: "Details", type: "textarea", dir: "auto" }]} /></div>
      </details>
    </div>
  );
}
