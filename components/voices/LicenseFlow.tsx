"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { newIdempotencyKey, postAction } from "./client";

type Opt = { value: string; label: string };
type Quote = { priceIxis: number; usd: number; estimatedSeconds: number; billedSeconds: number; illustrative: boolean; approvalRequired: boolean; allowanceUnits: number; allowanceAvailable: number; creditAvailable: number; creatorShareBps: number; apixisFeeBps: number; spendCap: number | null; spentThisMonth: number };

export function LicenseFlow({ voiceId, voiceName, uses, channels, territories, maxTerm, publicationAllowed, approvalRequired, legalNote }: { voiceId: string; voiceName: string; uses: Opt[]; channels: Opt[]; territories: Opt[]; maxTerm: number; publicationAllowed: boolean; approvalRequired: boolean; legalNote: string }) {
  const [script, setScript] = useState("");
  const [use, setUse] = useState(uses[0]?.value ?? "");
  const [ch, setCh] = useState<string[]>(channels[0] ? [channels[0].value] : []);
  const [publication, setPublication] = useState(publicationAllowed);
  const [territory, setTerritory] = useState(territories[0]?.value ?? "gcc");
  const [term, setTerm] = useState(Math.min(12, maxTerm));
  const [funding, setFunding] = useState<"wallet" | "allowance">("wallet");
  const [agree, setAgree] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ purchaseId: string; status: string } | null>(null);
  const idem = useMemo(() => newIdempotencyKey("lic"), []);
  const request = { script, declared_use: use, channels: ch, publication, territory, term_months: term };

  useEffect(() => { setQuote(null); }, [script, use, ch.join(), publication, territory, term]); // eslint-disable-line react-hooks/exhaustive-deps

  async function getQuote() {
    setBusy(true); setErr(null);
    const r = await postAction<Quote>("quote", { voiceId, request }); setBusy(false);
    if (r.ok) setQuote(r.data); else setErr(r.message);
  }
  async function buy() {
    setBusy(true); setErr(null);
    const r = await postAction<{ purchaseId: string; status: string }>("purchase", { voiceId, request, funding, idempotencyKey: idem }); setBusy(false);
    if (r.ok) setResult(r.data); else setErr(r.message);
  }

  if (result) return (
    <div className="card p-6" role="status">
      <h2 className="font-display text-2xl font-bold">{result.status === "fulfilled" ? "Your voiceover is ready" : result.status === "pending_approval" ? "Sent to the creator for approval" : `Status: ${result.status.replace(/_/g, " ")}`}</h2>
      <p className="mt-2 text-sm text-ink-2">{result.status === "pending_approval" ? "Nothing has been charged. When the creator approves your script you can pay and generate from your workspace." : result.status === "fulfilled" ? "Payment captured after delivery. Your receipt has the license terms frozen at purchase." : "We'll keep this updated in your workspace."}</p>
      <div className="mt-4 flex gap-3">
        <Link href={`/voices/receipts/${result.purchaseId}`} className="btn-primary px-4 py-2 text-sm">View receipt & download</Link>
        <Link href="/voices/workspace" className="btn-secondary px-4 py-2 text-sm">Workspace</Link>
      </div>
    </div>
  );

  const label = "mb-1 block text-sm text-ink-3";
  const input = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm";
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="card space-y-4 p-6">
        <div><label htmlFor="script" className={label}>Script (Arabic, English or mixed)</label>
          <textarea id="script" dir="auto" rows={7} value={script} onChange={(e) => setScript(e.target.value)} maxLength={5000} placeholder="اكتب النص هنا… / Type your script…" className={input} />
          <p className="mt-1 text-xs text-ink-3">{Array.from(script).length}/5000 characters. Scripts are kept 180 days and never used to train models.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="use" className={label}>Declared use</label><select id="use" value={use} onChange={(e) => setUse(e.target.value)} className={input}>{uses.map((u) => <option key={u.value} value={u.value} className="bg-[#0b0a24]">{u.label}</option>)}</select></div>
          <div><label htmlFor="territory" className={label}>Territory</label><select id="territory" value={territory} onChange={(e) => setTerritory(e.target.value)} className={input}>{territories.map((u) => <option key={u.value} value={u.value} className="bg-[#0b0a24]">{u.label}</option>)}</select></div>
          <div><label htmlFor="term" className={label}>Term (months, max {maxTerm})</label><input id="term" type="number" min={1} max={maxTerm} value={term} onChange={(e) => setTerm(Number(e.target.value))} className={input} /></div>
          <div className="flex items-end"><label className="flex items-center gap-2 text-sm text-ink-2"><input type="checkbox" checked={publication} disabled={!publicationAllowed} onChange={(e) => setPublication(e.target.checked)} className="accent-cyan-400" /> Public / published use{!publicationAllowed && " (not allowed for this voice)"}</label></div>
        </div>
        <fieldset><legend className={label}>Channels</legend><div className="flex flex-wrap gap-2">{channels.map((c) => (
          <label key={c.value} className="flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-sm text-ink-2"><input type="checkbox" checked={ch.includes(c.value)} onChange={(e) => setCh(e.target.checked ? [...ch, c.value] : ch.filter((x) => x !== c.value))} className="accent-cyan-400" />{c.label}</label>))}</div></fieldset>
        <button onClick={getQuote} disabled={busy || !script.trim()} className="btn-secondary px-4 py-2 text-sm disabled:opacity-60">{busy && !quote ? "Checking…" : "Check price & eligibility"}</button>
        {err && <p role="alert" className="text-sm text-red-300">{err}</p>}
      </div>
      <aside className="card space-y-3 p-6" aria-live="polite">
        <h2 className="font-display text-lg font-bold">License summary</h2>
        {!quote ? <p className="text-sm text-ink-3">Add your script and check the price. Nothing is charged until you confirm.</p> : (<>
          <p className="text-3xl font-bold">{funding === "allowance" ? `${quote.allowanceUnits} voiceover${quote.allowanceUnits > 1 ? "s" : ""}` : `${quote.priceIxis.toLocaleString()} Ixis`}</p>
          <p className="text-xs text-ink-3">≈ ${quote.usd.toFixed(2)} · ~{quote.estimatedSeconds}s, billed {quote.billedSeconds}s{quote.illustrative ? " · illustrative pricing" : ""}</p>
          <ul className="space-y-1 text-sm text-ink-2">
            <li>Voice: {voiceName}</li><li>Use: {uses.find((u) => u.value === use)?.label}</li><li>Channels: {ch.join(", ") || "none"}</li>
            <li>{publication ? "Published use" : "Internal / unpublished use"} · {territory} · {term} months · non-exclusive</li>
            <li>Creator receives {quote.creatorShareBps / 100}% of the amount after the {quote.apixisFeeBps / 100}% Apixis fee and provider cost.</li>
            {(approvalRequired || quote.approvalRequired) && <li className="text-amber-200">The creator approves each script before you pay.</li>}
            {quote.spendCap !== null && <li className="text-xs text-ink-3">Monthly spend cap: {quote.spentThisMonth.toLocaleString()} / {quote.spendCap.toLocaleString()} Ixis</li>}
          </ul>
          {quote.allowanceAvailable > 0 && <fieldset className="text-sm"><legend className="text-ink-3">Pay with</legend>
            <label className="mr-4"><input type="radio" checked={funding === "wallet"} onChange={() => setFunding("wallet")} /> Apixis Wallet (Ixis)</label>
            <label><input type="radio" checked={funding === "allowance"} onChange={() => setFunding("allowance")} /> Plan allowance ({quote.allowanceAvailable} left)</label></fieldset>}
          <label className="flex items-start gap-2 text-xs text-ink-2"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-cyan-400" />
            I confirm the declared use is accurate, I won&apos;t use this voice to impersonate anyone or for blocked uses, and I accept the Lyrixis Voices license (v1). <span className="text-amber-200">{legalNote}</span></label>
          <button onClick={buy} disabled={busy || !agree} className="btn-primary w-full py-2.5 text-sm disabled:opacity-60">{busy ? "Working…" : quote.approvalRequired ? "Send for creator approval" : funding === "allowance" ? "Use allowance & generate" : `Pay ${quote.priceIxis.toLocaleString()} Ixis & generate`}</button>
          <p className="text-xs text-ink-3">Your Wallet is held first and only charged after the audio is delivered. If generation fails the hold is released.</p>
        </>)}
      </aside>
    </div>
  );
}

export function DownloadButton({ purchaseId }: { purchaseId: string }) {
  const [err, setErr] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <button className="btn-primary px-4 py-2 text-sm" onClick={async () => { const r = await postAction<{ url: string }>("download", { purchaseId }); if (r.ok) { setUrl(r.data.url); } else setErr(r.message); }}>Get audio</button>
      {url && <div className="space-y-1"><audio controls preload="none" src={url} className="w-full" /><a href={url} className="text-sm text-cyan underline">Download WAV (link expires in 5 minutes)</a></div>}
      {err && <p role="alert" className="text-sm text-red-300">{err}</p>}
    </div>
  );
}
