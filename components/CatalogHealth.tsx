"use client";

import { GlowCard, Reveal } from "@/components/Motion";

const METRICS = [
  { label: "Tracks Analyzed", value: "2,847,921", change: "+142k this month" },
  { label: "Lyrics Coverage", value: "91.2%", change: "+4.1% post-ingest" },
  { label: "Metadata Complete", value: "98.7%", change: "ISRC / ISWC validated" },
  { label: "Languages Identified", value: "73", change: "Dialects tracked" },
  { label: "Issues Resolved", value: "18,492", change: "Conflicts auto-flagged" },
];

const ISSUES = [
  {
    title: "Missing lyrics detected",
    severity: "High",
    count: "1,240 tracks",
    desc: "Acoustic audio present but zero lyric lines registered with DSPs.",
  },
  {
    title: "ISRC / ISWC conflict",
    severity: "Critical",
    count: "418 works",
    desc: "Recording ISRC points to two distinct composition registrations.",
  },
  {
    title: "Language / dialect mismatch",
    severity: "Medium",
    count: "612 tracks",
    desc: "Distribution metadata lists Modern Standard Arabic; audio is Yemeni dialect.",
  },
  {
    title: "Explicit-content discrepancy",
    severity: "Medium",
    count: "89 tracks",
    desc: "Radio edit marked explicit; streaming clean version marked unrated.",
  },
  {
    title: "Low-confidence transcription",
    severity: "Review",
    count: "305 lines",
    desc: "Heavy vocal processing flagged for human-in-the-loop review.",
  },
];

export function CatalogHealth() {
  return (
    <div id="catalog-health" className="mx-auto max-w-7xl px-6">
      <Reveal className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-3.5 py-1 text-xs font-mono uppercase tracking-[0.2em] text-cyan">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-pulse" />
          Enterprise Demo · Example Catalog
        </div>
        <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
          Continuous catalog <span className="grad-text">health monitoring.</span>
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-ink-2">
          Labels and distributors run millions of recordings through Lyrixis to catch missing lyrics, metadata collisions, and compliance gaps before DSP delivery.
        </p>
      </Reveal>

      {/* Top metrics bar */}
      <Reveal delay={100} className="mt-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {METRICS.map((m) => (
            <div key={m.label} className="glass rounded-2xl p-4 text-center">
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{m.label}</p>
              <p className="grad-text mt-1.5 font-display text-2xl font-bold sm:text-3xl">{m.value}</p>
              <p className="mt-1 text-[11px] text-cyan">{m.change}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Issues feed */}
      <Reveal delay={180} className="mt-8">
        <div className="glass rounded-3xl p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <h3 className="font-display text-lg font-semibold">Active Catalog Audits</h3>
              <p className="text-xs text-ink-3">Live ingestion queue flagged for reconciliation</p>
            </div>
            <span className="font-mono text-xs text-ink-3">Demo feed · refreshed every sync</span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {ISSUES.map((issue) => (
              <GlowCard key={issue.title} className="p-4" tilt={4}>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase ${
                      issue.severity === "Critical"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : issue.severity === "High"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-cyan/15 text-cyan border border-cyan/30"
                    }`}
                  >
                    {issue.severity}
                  </span>
                  <span className="font-mono text-xs text-ink-3">{issue.count}</span>
                </div>
                <p className="mt-2.5 text-sm font-semibold text-ink">{issue.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-2">{issue.desc}</p>
              </GlowCard>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  );
}
