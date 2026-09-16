import type { Metadata } from "next";
import { CixyChat } from "@/components/CixyChat";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "Cixy — Lyrixis native AI",
  description:
    "Cixy is the Apixis-family AI, specialized for Lyrixis: mixing, mastering, beat making, songwriting, metadata, distribution, royalties, and live catalog search.",
};

const SKILLS = [
  ["Audio engineering", "Gain staging, EQ, compression, bus processing, reference mixing."],
  ["Mastering & loudness", "LUFS / true-peak targets per platform, limiting, delivery specs."],
  ["Beat making", "DAWs, drum programming, sampling, sound design, tempo & key."],
  ["Songwriting", "Hooks, structure, prosody, rhyme — quotes only public-domain or your own."],
  ["Metadata", "ISRC, ISWC, UPC, splits, PROs, MLC, master vs. publishing."],
  ["Distribution & royalties", "Release timelines, pitching, per-stream math, sync, catalog value."],
];

export default function CixyPage() {
  return (
    <div>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan">
              <span className="grad-text">◈</span> A Apixis Company
            </p>
            <h1 className="mt-3 font-display text-5xl font-bold leading-tight">
              Cixy <span className="grad-text">— Lyrixis native AI</span>
            </h1>
            <p className="mt-4 text-lg text-ink-2">
              One shared Apixis brain, specialized for music catalogs. Ask like you would ask a senior
              engineer, A&amp;R, and label ops lead in one chair. She can search the Lyrixis catalog live
              and cite records by title, ISRC, and writers.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {SKILLS.map(([title, copy]) => (
                <div key={title} className="card p-4">
                  <p className="font-display text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-xs text-ink-2">{copy}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs text-ink-3">
              Cixy runs on Anthropic Claude. Conversations are logged with an anonymous session id only. No
              legal or tax advice; no live charges.
            </p>
          </div>
          <div className="card flex flex-col overflow-hidden p-0">
            <div className="border-b border-white/10 px-4 py-3">
              <p className="font-display text-sm font-semibold">
                <span className="grad-text">◈</span> Cixy
              </p>
              <p className="text-[11px] text-ink-3">Lyrixis native AI</p>
            </div>
            <CixyChat tall />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
