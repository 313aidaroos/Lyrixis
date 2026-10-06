"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { lists } from "./client";

type E = { voice: { slug: string; display_name: string; display_name_ar: string | null; dialects: string[]; tones: string[]; use_categories: string[]; licensing_mode: string; earned_verification: string | null; is_demo: boolean }; permissions: { publication: boolean; auditions: boolean; max_term_months: number; custom_recordings: boolean }; fromIxis: number };

function useCatalog() {
  const [all, setAll] = useState<E[] | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => { fetch("/api/voices").then((r) => r.json()).then((j) => setAll(j.voices ?? [])).catch(() => setAll([])); }, []);
  useEffect(() => { const f = () => setTick((t) => t + 1); window.addEventListener("lyxv-lists", f); return () => window.removeEventListener("lyxv-lists", f); }, []);
  return { all, tick };
}

export function CompareTable() {
  const { all } = useCatalog();
  const [slugs, setSlugs] = useState<string[]>([]);
  useEffect(() => { const f = () => setSlugs(lists.compare()); f(); window.addEventListener("lyxv-lists", f); return () => window.removeEventListener("lyxv-lists", f); }, []);
  if (!all) return <p className="text-ink-3">Loading…</p>;
  const rows = slugs.map((s) => all.find((e) => e.voice.slug === s)).filter(Boolean) as E[];
  if (!rows.length) return <div className="card p-8 text-center text-ink-2">Your shortlist is empty. Tap <strong>+ Compare</strong> on up to 4 voices.</div>;
  const line = (label: string, f: (e: E) => React.ReactNode) => <tr className="border-t border-white/5"><th scope="row" className="py-2 pr-4 text-left font-normal text-ink-3">{label}</th>{rows.map((e) => <td key={e.voice.slug} className="py-2 pr-4">{f(e)}</td>)}</tr>;
  return (
    <div className="card overflow-x-auto p-5"><table className="w-full min-w-[560px] text-sm">
      <thead><tr><th />{rows.map((e) => <th key={e.voice.slug} className="pb-2 pr-4 text-left"><Link href={`/voices/${e.voice.slug}`} className="font-display text-base hover:text-cyan">{e.voice.display_name}</Link><button onClick={() => lists.toggleCompare(e.voice.slug)} className="ml-2 text-xs text-ink-3" aria-label={`Remove ${e.voice.display_name}`}>✕</button></th>)}</tr></thead>
      <tbody>
        {line("Dialects", (e) => e.voice.dialects.join(", "))}
        {line("Tones", (e) => e.voice.tones.join(", "))}
        {line("Good for", (e) => e.voice.use_categories.join(", "))}
        {line("From", (e) => `${e.fromIxis} Ixis / 60s`)}
        {line("Licensing", (e) => e.voice.licensing_mode === "approval_required" ? "Creator approves" : "Instant")}
        {line("Published use", (e) => e.permissions.publication ? "Yes" : "Internal only")}
        {line("Max term", (e) => `${e.permissions.max_term_months} mo`)}
        {line("Custom recording", (e) => e.permissions.custom_recordings ? "Yes" : "No")}
        {line("Verification", (e) => e.voice.earned_verification ? "Verified" : "Not verified")}
      </tbody></table></div>
  );
}

export function SavedLists() {
  const { all, tick } = useCatalog();
  if (!all) return <p className="text-ink-3">Loading…</p>;
  void tick;
  const block = (title: string, slugs: string[]) => {
    const rows = slugs.map((s) => all.find((e) => e.voice.slug === s)).filter(Boolean) as E[];
    return (
      <section className="card p-5"><h2 className="font-display text-lg font-bold">{title}</h2>
        {rows.length ? <ul className="mt-3 divide-y divide-white/5">{rows.map((e) => <li key={e.voice.slug} className="flex items-center justify-between py-2 text-sm"><Link href={`/voices/${e.voice.slug}`} className="hover:text-cyan">{e.voice.display_name}</Link><span className="text-ink-3">{e.voice.dialects.join(", ")}</span></li>)}</ul> : <p className="mt-2 text-sm text-ink-3">Nothing yet.</p>}
      </section>
    );
  };
  return <div className="grid gap-6 md:grid-cols-2">{block("Saved voices", lists.saved())}{block("Recently viewed", lists.recent())}</div>;
}
