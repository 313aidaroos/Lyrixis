import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionButton, ActionForm } from "@/components/voices/ui";
import { Pill } from "@/components/voices/server";
import { getActor, getVoices } from "@/lib/voices/context";
import { CHANNELS, DIALECTS, LANGUAGES, LEGAL_REVIEW_NOTE, TERRITORIES, TONES, USES, dialectLabel } from "@/lib/voices/config";
import { CLONING_CONSENT_TEXT } from "@/lib/voices/service";

const opt = <T extends string>(xs: readonly T[]) => xs.map((x) => ({ value: x, label: x.replace(/_/g, " ") }));

export default async function CreatorPage() {
  const [svc, actor] = await Promise.all([getVoices(), getActor()]);
  if (!actor) redirect("/login?next=/voices/creator");
  const dash = await svc.creatorDashboard(actor);
  if (!dash) return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-3xl font-extrabold">Become a Lyrixis Voices creator</h1>
      <p className="text-ink-2">License your own voice to businesses on your terms. You choose what it may be used for, approve scripts if you want, and can pause or retire it any time. Earnings are 60% of each license after the 5% Apixis fee and provider cost, credited in Ixis.</p>
      <p className="text-sm text-amber-200">Payouts are not available yet — earnings accrue on the Lyrixis ledger until a payout rail is approved. Earnings are not guaranteed.</p>
      <div className="card p-6"><ActionForm action="creator.become" submit="Create creator profile" fields={[
        { name: "handle", label: "Handle (public URL)", type: "text", required: true, placeholder: "e.g. noura-voice" },
        { name: "display_name", label: "Display name", type: "text", required: true },
        { name: "display_name_ar", label: "الاسم بالعربية (optional)", type: "text", dir: "auto" },
        { name: "bio", label: "Short bio", type: "textarea", dir: "auto" },
        { name: "hire_enabled", label: "I'm open to custom human recordings", type: "checkbox" },
        { name: "adult", label: "I am 18 or older", type: "checkbox" },
        { name: "accept_creator_terms", label: `I accept the Lyrixis Voices creator terms (v1). ${LEGAL_REVIEW_NOTE}`, type: "checkbox" },
      ]} /></div>
    </div>
  );
  const { creator, balances, voices, approvals, custom, usage, adjustments } = dash;
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="font-display text-3xl font-extrabold">Creator dashboard</h1><p className="text-ink-2">{creator.display_name} · <Link className="text-cyan" href={`/voices/creators/${creator.handle}`}>public storefront</Link></p></div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {(["pending", "available", "paid"] as const).map((k) => <div key={k} className="card px-4 py-3"><p className="text-2xl font-bold">{balances[k].toLocaleString()}</p><p className="text-xs text-ink-3">{k === "pending" ? "Pending (14-day hold)" : k === "available" ? "Available" : "Paid out"} · Ixis</p></div>)}
        </div>
      </header>
      <p className="card p-4 text-sm text-amber-200">{dash.payoutNote} <ActionButton action="creator.payout" body={{}} label="Request payout" /></p>
      {approvals.length > 0 && <section className="card space-y-3 p-5"><h2 className="font-display text-lg font-bold">Scripts waiting for your approval</h2>
        {approvals.map((a) => <div key={a.id} className="rounded-lg border border-white/10 p-3 text-sm"><p className="text-ink-3">Use: {a.declared_use}</p><p dir="auto" className="mt-1 whitespace-pre-wrap text-ink-2">{a.script_excerpt}</p><div className="mt-2 flex gap-2"><ActionButton action="creator.approval" body={{ approvalId: a.id, approve: true }} label="Approve" variant="primary" /><ActionButton action="creator.approval" body={{ approvalId: a.id, approve: false }} label="Decline" /></div></div>)}</section>}
      <section className="space-y-4"><h2 className="font-display text-xl font-bold">Your voices</h2>
        {voices.map((v) => (
          <div key={v.id} className="card space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><Link href={`/voices/${v.slug}`} className="font-display text-lg font-bold hover:text-cyan">{v.display_name}</Link><p className="mt-1 flex flex-wrap gap-1">{v.dialects.map((d) => <Pill key={d} tone="cyan">{dialectLabel(d)}</Pill>)}<Pill tone={v.status === "active" ? "green" : "amber"}>{v.status.replace(/_/g, " ")}</Pill><Pill>{v.verification_status.replace(/_/g, " ")}</Pill><Pill>dialect review: {v.dialect_review_status}</Pill></p></div>
              <div className="flex gap-2">{v.status === "active" && <ActionButton action="creator.pause" body={{ voiceId: v.id }} label="Pause" confirm="Pause this voice? New licenses and queued jobs stop immediately." />}{v.status === "paused" && <ActionButton action="creator.resume" body={{ voiceId: v.id }} label="Resume" />}{v.status !== "retired" && <ActionButton action="creator.retire" body={{ voiceId: v.id }} label="Retire" confirm="Retire permanently? Existing licenses keep their frozen terms." />}</div>
            </div>
            {["draft", "verification_pending", "review_pending"].includes(v.status) && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 rounded-lg border border-white/10 p-4"><h3 className="text-sm font-bold">1 · Public sample</h3><ActionForm action="creator.sample" extra={{ voiceId: v.id, language: v.languages[0] ?? "ar" }} submit="Upload sample" fields={[{ name: "title", label: "Title", type: "text", required: true }, { name: "file", label: "Audio (wav/mp3, ≤10 MB)", type: "file" }]} /></div>
                <div className="space-y-2 rounded-lg border border-white/10 p-4"><h3 className="text-sm font-bold">2 · Private training audio</h3><p className="text-xs text-ink-3">Never published. Kept up to 365 days, deleted on retire.</p><ActionForm action="creator.training" extra={{ voiceId: v.id }} submit="Upload training audio" fields={[{ name: "file", label: "Audio (wav/mp3/flac, ≤100 MB)", type: "file" }]} /></div>
                <div className="space-y-2 rounded-lg border border-white/10 p-4"><h3 className="text-sm font-bold">3 · Cloning consent</h3><p className="whitespace-pre-line text-xs text-ink-2">{CLONING_CONSENT_TEXT}</p><p className="text-xs text-amber-200">{LEGAL_REVIEW_NOTE}</p><ActionForm action="creator.consent" extra={{ voiceId: v.id }} submit="Give consent" fields={[{ name: "typed_name", label: "Type your full name", type: "text", required: true }, { name: "accept", label: "I agree", type: "checkbox" }]} /></div>
                <div className="space-y-2 rounded-lg border border-white/10 p-4"><h3 className="text-sm font-bold">4 · Submit for verification</h3><p className="text-xs text-ink-3">We verify through the voice provider when available (you&apos;ll read a short CAPTCHA phrase); otherwise a Lyrixis admin reviews manually.</p><ActionButton action="creator.submit" body={{ voiceId: v.id }} label="Submit" variant="primary" />
                  {v.status === "verification_pending" && <ActionForm action="creator.verify" extra={{ voiceId: v.id }} submit="Upload CAPTCHA recording" fields={[{ name: "file", label: "Your recording of the phrase", type: "file" }]} />}</div>
              </div>
            )}
            <details className="rounded-lg border border-white/10 p-4"><summary className="cursor-pointer text-sm text-ink-2">Permissions (v{v.current_permission_version}) — changes apply to new licenses only</summary>
              <div className="mt-3"><ActionForm action="creator.permissions" nest="patch" extra={{ voiceId: v.id }} submit="Save new permission version" fields={[
                { name: "sample_playback", label: "Public sample playback", type: "checkbox", defaultChecked: v.permissions.sample_playback },
                { name: "auditions", label: "Allow auditions", type: "checkbox", defaultChecked: v.permissions.auditions },
                { name: "paid_generation", label: "Allow paid generation", type: "checkbox", defaultChecked: v.permissions.paid_generation },
                { name: "publication", label: "Allow published use", type: "checkbox", defaultChecked: v.permissions.publication },
                { name: "custom_recordings", label: "Accept custom recording requests", type: "checkbox", defaultChecked: v.permissions.custom_recordings },
                { name: "assistant_use", label: "Allow Lyrixis assistants (Cixy) to recommend this voice", type: "checkbox", defaultChecked: v.permissions.assistant_use },
                { name: "allowed_uses", label: "Allowed uses (none = any non-blocked)", type: "multi", options: USES.map((u) => ({ value: u.id, label: u.label })), defaultValue: v.permissions.allowed_uses },
                { name: "allowed_channels", label: "Allowed channels (none = any)", type: "multi", options: opt(CHANNELS), defaultValue: v.permissions.allowed_channels },
                { name: "allowed_territories", label: "Territories", type: "multi", options: opt(TERRITORIES), defaultValue: v.permissions.allowed_territories },
                { name: "max_term_months", label: "Max term (months)", type: "number", defaultValue: v.permissions.max_term_months },
              ]} /></div></details>
          </div>
        ))}
        <details className="card p-5"><summary className="cursor-pointer font-bold">+ Add a voice</summary><div className="mt-3"><ActionForm action="creator.voice" submit="Create draft" fields={[
          { name: "slug", label: "URL slug", type: "text", required: true }, { name: "display_name", label: "Voice name", type: "text", required: true }, { name: "display_name_ar", label: "الاسم بالعربية", type: "text", dir: "auto" },
          { name: "description", label: "Description", type: "textarea", dir: "auto" },
          { name: "languages", label: "Languages", type: "multi", options: LANGUAGES.map((l) => ({ value: l.id, label: l.label })) },
          { name: "dialects", label: "Dialects (required — be specific)", type: "multi", options: DIALECTS.map((d) => ({ value: d.id, label: d.label })) },
          { name: "tones", label: "Tones", type: "multi", options: opt(TONES) },
          { name: "use_categories", label: "Good for", type: "multi", options: USES.map((u) => ({ value: u.id, label: u.label })) },
          { name: "licensing_mode", label: "Licensing", type: "select", options: [{ value: "instant", label: "Instant" }, { value: "approval_required", label: "I approve each script" }] },
        ]} /></div></details>
      </section>
      {custom.length > 0 && <section className="card space-y-3 p-5"><h2 className="font-display text-lg font-bold">Custom recording requests</h2>
        {custom.map((r) => <div key={r.id} className="rounded-lg border border-white/10 p-3 text-sm"><p className="text-ink-3">{r.status.replace(/_/g, " ")} · {r.declared_use}{r.quote_ixis ? ` · quoted ${r.quote_ixis} Ixis` : ""} · revisions {r.revisions_used}/{r.max_revisions}</p><p dir="auto" className="mt-1 text-ink-2">{r.brief}</p>
          {r.status === "requested" && <ActionForm compact action="creator.custom-quote" extra={{ requestId: r.id }} submit="Send quote" fields={[{ name: "ixis", label: "Price (Ixis, min 2,500)", type: "number", required: true, defaultValue: 2500 }]} />}
          {(r.status === "accepted_held" || r.status === "revision_requested") && <ActionForm action="creator.custom-deliver" extra={{ requestId: r.id }} submit="Deliver recording" fields={[{ name: "file", label: "Recording", type: "file" }]} />}</div>)}</section>}
      <section className="card p-5"><h2 className="font-display text-lg font-bold">Usage</h2>
        {usage.length ? <table className="mt-3 w-full text-sm"><thead className="text-left text-ink-3"><tr><th className="py-1">When</th><th>Use</th><th>Channels</th><th>Length</th><th>Price</th><th>Status</th></tr></thead><tbody>{usage.map((u) => <tr key={u.id} className="border-t border-white/5"><td className="py-1">{new Date(u.created_at).toLocaleDateString()}</td><td>{u.declared_use}</td><td>{u.channels.join(", ")}</td><td>{u.billed_seconds}s</td><td>{u.funding === "allowance" ? "plan" : `${u.price_ixis} Ixis`}{u.is_demo ? " (demo)" : ""}</td><td>{u.status.replace(/_/g, " ")}</td></tr>)}</tbody></table> : <p className="mt-2 text-sm text-ink-3">No licenses yet.</p>}
        {adjustments.length > 0 && <p className="mt-3 text-xs text-ink-3">Refund adjustments: {adjustments.map((a) => `${a.amount} Ixis`).join(", ")}</p>}
      </section>
    </div>
  );
}
