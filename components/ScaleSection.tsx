"use client";

import Link from "next/link";
import { GlowCard, Reveal, CountUp } from "@/components/Motion";

const MILESTONES = [
  {
    count: 1,
    suffix: " track",
    headline: "The Independent Artist",
    copy: "Synced lyrics for one song at $3 (300 Ixis), or unlimited song lyrics on All-Access at $30 a month.",
    badge: "$3 or $30/mo",
  },
  {
    count: 100,
    suffix: " tracks",
    headline: "The Studio EP & LP Run",
    copy: "All-Access covers unlimited song lyrics for $30 a month (3,000 Ixis). It renews monthly. Cancel anytime.",
    badge: "$30 / month",
  },
  {
    count: 10000,
    suffix: " tracks",
    headline: "The Label Catalog Ingest",
    copy: "Labels and companies use Label / Enterprise. There is no fixed price. Contact sales and Awad will reply.",
    badge: "Contact sales",
  },
  {
    count: 1000000,
    suffix: "+ tracks",
    headline: "The DSP & Distributor Scale",
    copy: "Large catalogs use the same Contact sales form. Team seats and songs per month are part of that request.",
    badge: "Contact sales",
  },
];

export function ScaleSection() {
  return (
    <div id="scale" className="mx-auto max-w-7xl px-6">
      <Reveal className="text-center">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan">Scalable Infrastructure</p>
        <h2 className="mt-3 font-display text-4xl font-bold sm:font-marquee sm:text-5xl">
          One engine. <span className="grad-text">Any catalog size.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-2">
          Whether you&apos;re releasing your first song or managing millions of recordings, Lyrixis uses the same verified intelligence engine.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {MILESTONES.map((m, i) => (
          <Reveal key={m.headline} delay={i * 80}>
            <GlowCard className="flex h-full flex-col justify-between p-6">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs uppercase tracking-wider text-ink-3">Tier 0{i + 1}</span>
                  <span className="rounded-full border border-violet/30 bg-violet/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-violet">
                    {m.badge}
                  </span>
                </div>

                <div className="mt-4 font-display text-3xl font-bold text-ink">
                  <CountUp to={m.count} suffix={m.suffix} duration={1600} />
                </div>

                <h3 className="mt-3 font-display text-lg font-semibold text-ink">{m.headline}</h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-2">{m.copy}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-line/60">
                <span className="text-xs text-cyan flex items-center gap-1 group-hover:gap-2 transition-all">
                  Instant processing <span className="arrow">→</span>
                </span>
              </div>
            </GlowCard>
          </Reveal>
        ))}
      </div>

      <Reveal delay={200} className="mt-12 flex flex-wrap items-center justify-center gap-4">
        <Link href="/add" className="btn-primary">
          Process a song <span className="arrow">→</span>
        </Link>
        <Link href="/pricing#contact-sales" className="btn-secondary">
          Contact sales
        </Link>
      </Reveal>
    </div>
  );
}
