import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DownloadButton } from "@/components/voices/LicenseFlow";
import { ActionButton } from "@/components/voices/ui";
import { Pill } from "@/components/voices/server";
import { getActor, getVoices } from "@/lib/voices/context";
import { VoicesError } from "@/lib/voices/errors";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [svc, actor] = await Promise.all([getVoices(), getActor()]);
  if (!actor) redirect(`/login?next=/voices/receipts/${id}`);
  let r;
  try { r = await svc.receipt(actor, id); } catch (e) { if (e instanceof VoicesError && e.status === 404) notFound(); throw e; }
  const p = r.purchase; const s = p.terms_snapshot;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-2"><h1 className="font-display text-3xl font-extrabold">Receipt</h1>{r.isDemo && <Pill tone="amber">Demo — no real money</Pill>}<Pill tone={p.status === "fulfilled" ? "green" : "plain"}>{p.status.replace(/_/g, " ")}</Pill></div>
      <section className="card space-y-2 p-6 text-sm text-ink-2">
        <p><span className="text-ink-3">Receipt</span> <span className="font-mono">{p.id}</span></p>
        <p><span className="text-ink-3">Voice</span> <Link href={`/voices/${s.voice.slug}`} className="text-cyan">{s.voice.display_name}</Link> · model {s.voice.model_version ?? "—"} · permissions v{s.voice.permission_version}</p>
        <p><span className="text-ink-3">Paid</span> {p.funding === "allowance" ? `${p.allowance_units} plan voiceover(s)` : `${p.price_ixis.toLocaleString()} Ixis (≈ $${(p.price_ixis / 100).toFixed(2)})`} · billed {p.billed_seconds}s{s.price.illustrative ? " · illustrative pricing" : ""}</p>
        {p.wallet_receipt_id && <p><span className="text-ink-3">Wallet receipt</span> <span className="font-mono">{p.wallet_receipt_id}</span></p>}
        <p><span className="text-ink-3">Terms</span> {p.terms_version} · <span className="font-mono text-xs">{p.terms_hash.slice(0, 16)}…</span> · script hash <span className="font-mono text-xs">{(s.script_hash ?? "").slice(0, 12)}…</span> ({s.script_chars} chars)</p>
      </section>
      <section className="card p-6">
        <h2 className="font-display text-lg font-bold">License (frozen at purchase)</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-2">{r.summary.map((l) => <li key={l}>{l}</li>)}</ul>
        {r.split && <p className="mt-3 text-xs text-ink-3">Split: Apixis fee {r.split.apixisFee} · provider {r.split.providerCost} · creator {r.split.creatorShare} · Lyrixis {r.split.lyrixisMargin} Ixis.</p>}
        <p className="mt-3 text-xs text-amber-200">{r.legal}</p>
      </section>
      <section className="card p-6">
        <h2 className="mb-3 font-display text-lg font-bold">Audio</h2>
        {p.status === "fulfilled" ? <DownloadButton purchaseId={p.id} />
          : p.status === "approved" ? <ActionButton action="pay" body={{ purchaseId: p.id }} label={`Pay ${p.price_ixis} Ixis & generate`} variant="primary" />
          : <p className="text-sm text-ink-3">{p.status === "pending_approval" ? "Waiting for the creator to approve your script. Nothing has been charged." : p.status === "failed_released" ? "Generation failed and your Wallet hold was released — you were not charged." : p.status === "refunded" ? "Refunded as Lyrixis credit." : "Not ready yet."}</p>}
      </section>
    </div>
  );
}
