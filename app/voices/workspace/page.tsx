import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionButton, ActionForm } from "@/components/voices/ui";
import { Pill } from "@/components/voices/server";
import { getActor, getVoices, voicesOpen } from "@/lib/voices/context";
import { API_SCOPES } from "@/lib/voices/service";

export default async function WorkspacePage() {
  if (!voicesOpen()) return null; // Voices closed: the layout shows "Opening soon"; skip DB reads.
  const [svc, actor] = await Promise.all([getVoices(), getActor()]);
  if (!actor) redirect("/login?next=/voices/workspace");
  const ws0 = await svc.ensureWorkspace(actor);
  const o = await svc.workspaceOverview(actor, ws0.id);
  const [packages, voices] = await Promise.all([svc.repo.find("voice_packages"), svc.catalog()]);
  const name = new Map(voices.map((e) => [e.voice.id, e.voice.display_name]));
  const custom = await svc.repo.find("voice_custom_requests", { workspace_id: o.ws.id }, { order: "created_at", desc: true });
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="font-display text-3xl font-extrabold">{o.ws.name}</h1><p className="text-sm text-ink-3">Your role: {o.role}{o.ws.is_demo ? " · demo workspace" : ""}</p></div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="card px-4 py-3"><p className="text-2xl font-bold">{o.ws.allowance_voiceovers}</p><p className="text-xs text-ink-3">plan voiceovers left</p></div>
          <div className="card px-4 py-3"><p className="text-2xl font-bold">{o.ws.credit_ixis}</p><p className="text-xs text-ink-3">Lyrixis credit (Ixis)</p></div>
          <div className="card px-4 py-3"><p className="text-2xl font-bold">{o.spentThisMonth}</p><p className="text-xs text-ink-3">spent this month{o.ws.monthly_spend_cap_ixis !== null ? ` / cap ${o.ws.monthly_spend_cap_ixis}` : ""}</p></div>
        </div>
      </header>
      <section className="card p-5"><h2 className="font-display text-lg font-bold">Voiceovers & licenses</h2>
        {o.purchases.length ? <table className="mt-3 w-full text-sm"><thead className="text-left text-ink-3"><tr><th className="py-1">When</th><th>Voice</th><th>Use</th><th>Paid</th><th>Status</th><th /></tr></thead><tbody>{o.purchases.map((p) => <tr key={p.id} className="border-t border-white/5"><td className="py-1.5">{new Date(p.created_at).toLocaleString()}</td><td>{name.get(p.voice_id) ?? p.terms_snapshot.voice.display_name}</td><td>{p.terms_snapshot.declared_use}</td><td>{p.funding === "allowance" ? `${p.allowance_units} plan` : `${p.price_ixis} Ixis`}</td><td><Pill tone={p.status === "fulfilled" ? "green" : "plain"}>{p.status.replace(/_/g, " ")}</Pill></td><td className="text-right"><Link href={`/voices/receipts/${p.id}`} className="text-cyan">Receipt</Link></td></tr>)}</tbody></table>
          : <p className="mt-2 text-sm text-ink-3">No voiceovers yet. <Link href="/voices" className="text-cyan">Find a voice</Link>.</p>}
      </section>
      {custom.length > 0 && <section className="card space-y-2 p-5"><h2 className="font-display text-lg font-bold">Custom recordings</h2>{custom.map((r) => <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 py-2 text-sm"><span>{name.get(r.voice_id)} · {r.status.replace(/_/g, " ")}{r.quote_ixis ? ` · ${r.quote_ixis} Ixis` : ""}</span><span className="flex gap-2">{r.status === "quoted" && <ActionButton action="custom.accept-quote" body={{ requestId: r.id }} label="Accept quote" variant="primary" />}{r.status === "delivered" && <><ActionButton action="custom.finish" body={{ requestId: r.id, action: "accept" }} label="Accept delivery" variant="primary" />{r.revisions_used < r.max_revisions && <ActionButton action="custom.finish" body={{ requestId: r.id, action: "revise" }} label="Request revision" />}</>}</span></div>)}</section>}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="card space-y-3 p-5"><h2 className="font-display text-lg font-bold">Brand & spend controls</h2>
          <ActionForm action="workspace.update" extra={{ workspaceId: o.ws.id }} submit="Save" fields={[{ name: "name", label: "Workspace name", type: "text", defaultValue: o.ws.name }, { name: "brand_name", label: "Brand name", type: "text", defaultValue: o.ws.brand_name ?? "" }, { name: "monthly_spend_cap_ixis", label: "Monthly spend cap (Ixis)", type: "number", defaultValue: o.ws.monthly_spend_cap_ixis ?? "" }, { name: "preferred_voice_id", label: "Brand voice (a preference, not exclusive)", type: "select", defaultValue: o.ws.preferred_voice_id ?? "", options: [{ value: "", label: "None" }, ...voices.map((e) => ({ value: e.voice.id, label: e.voice.display_name }))] }]} /></section>
        <section className="card space-y-3 p-5"><h2 className="font-display text-lg font-bold">Pronunciations</h2><p className="text-xs text-ink-3">Applied to every script before generation.</p>
          <ul className="text-sm">{o.pronunciations.map((p) => <li key={p.id} dir="auto">{p.term} → {p.say_as}</li>)}</ul>
          <ActionForm compact action="workspace.pronunciation" extra={{ workspaceId: o.ws.id }} submit="Add" fields={[{ name: "term", label: "Word", type: "text", required: true, dir: "auto" }, { name: "sayAs", label: "Say as", type: "text", required: true, dir: "auto" }]} /></section>
        <section className="card space-y-3 p-5"><h2 className="font-display text-lg font-bold">Projects</h2><ul className="text-sm">{o.projects.map((p) => <li key={p.id}>{p.name}</li>)}</ul><ActionForm compact action="workspace.project" extra={{ workspaceId: o.ws.id }} submit="Create" fields={[{ name: "name", label: "Project name", type: "text", required: true }]} /></section>
        <section className="card space-y-3 p-5"><h2 className="font-display text-lg font-bold">Plans</h2>
          {packages.map((p) => <div key={p.id} className="text-sm"><p className="font-bold">{p.name} · {p.monthly_price_ixis.toLocaleString()} Ixis/mo{p.illustrative ? "*" : ""}</p><p className="text-ink-3">{p.voiceovers_per_month} voiceovers/mo (never unlimited), {p.seats} seat{p.seats > 1 ? "s" : ""}, overage {p.overage_ixis} Ixis{p.brand_voice ? ", brand voice" : ""}</p></div>)}
          <p className="text-xs text-amber-200">Monthly plans need Apixis Wallet subscriptions, which aren&apos;t live yet. Until then an admin can grant a plan allowance manually. Exclusive or custom deals are quoted.</p></section>
        <section className="card space-y-3 p-5 md:col-span-2"><h2 className="font-display text-lg font-bold">API keys (Socixis / partners)</h2><p className="text-xs text-ink-3">The key is shown once. Scopes: {API_SCOPES.join(", ")}.</p>
          <ActionForm action="workspace.apikey" extra={{ workspaceId: o.ws.id }} submit="Create key" fields={[{ name: "label", label: "Label", type: "text", required: true, defaultValue: "Socixis" }, { name: "scopes", label: "Scopes", type: "multi", options: API_SCOPES.map((s) => ({ value: s, label: s })), defaultValue: ["voices:read", "generations:read"] }]} /></section>
      </div>
    </div>
  );
}
