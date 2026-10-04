import { Filters, VoiceCard } from "@/components/voices/server";
import { getVoices } from "@/lib/voices/context";

export default async function VoicesHome({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const svc = await getVoices();
  const [voices, cfg] = await Promise.all([svc.catalog({ q: q.q, language: q.language || undefined, dialect: q.dialect || undefined, use: q.use || undefined }), svc.pricing()]);
  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan">Arabic & bilingual voice licensing</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">Real voices, <span className="grad-text">real consent.</span></h1>
        <p className="mt-4 text-lg text-ink-2">License a creator&apos;s voice for a declared use, pay in Ixis from your Apixis Wallet, and get a receipt with the terms frozen. Every voice has a named dialect — never just &ldquo;Arabic&rdquo;.</p>
        <p className="mt-2 text-sm text-ink-3">From {cfg.payg_base_ixis} Ixis per voiceover up to {cfg.payg_base_seconds}s, +{cfg.payg_step_ixis} per extra {cfg.payg_step_seconds}s.{cfg.illustrative && " *Illustrative pricing — final prices follow provider-cost verification."}</p>
      </header>
      <Filters q={q} />
      <p className="text-sm text-ink-3" aria-live="polite">{voices.length} voice{voices.length === 1 ? "" : "s"}</p>
      {voices.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{voices.map((e) => <VoiceCard key={e.voice.id} e={e} />)}</div>
        : <div className="card p-8 text-center text-ink-2">No voices match those filters yet. Try another dialect or clear the search.</div>}
    </div>
  );
}
