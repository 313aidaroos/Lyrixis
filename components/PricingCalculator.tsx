"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface Tier {
  min_songs: number;
  max_songs: number | null;
  rate_ixis: number;
}

// 100 Ixis = $1
const DEFAULT_TIERS: Tier[] = [
  { min_songs: 1, max_songs: 99, rate_ixis: 300 }, // $2.99 → 300 Ixis
  { min_songs: 100, max_songs: 999, rate_ixis: 150 }, // $1.49 → 150 Ixis
  { min_songs: 1000, max_songs: 9999, rate_ixis: 75 }, // $0.75 → 75 Ixis
  { min_songs: 10000, max_songs: 99999, rate_ixis: 40 }, // $0.40 → 40 Ixis
  { min_songs: 100000, max_songs: 999999, rate_ixis: 20 }, // $0.20 → 20 Ixis
  { min_songs: 1000000, max_songs: null, rate_ixis: 20 }, // Enterprise: $0.20 → 20 Ixis
];

export function PricingCalculator() {
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS);
  const [count, setCount] = useState<number>(10000);

  useEffect(() => {
    let active = true;
    fetch("/api/pricing/tiers")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.tiers && Array.isArray(data.tiers) && data.tiers.length > 0) {
          setTiers(data.tiers);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const quote = useMemo(() => {
    const tier = tiers.find(
      (t) => count >= t.min_songs && (t.max_songs === null || count <= t.max_songs)
    ) || tiers[tiers.length - 1];

    const rateIxis = tier.rate_ixis;
    const totalIxis = count * rateIxis;
    const totalDollars = totalIxis / 100;
    const isEnterprise = count >= 1000000;

    return {
      tier,
      rateIxis,
      rateFormatted: `${rateIxis.toLocaleString()} Ixis · $${(rateIxis / 100).toFixed(2)}`,
      totalFormatted: isEnterprise
        ? "Custom Enterprise"
        : `${Math.round(totalIxis).toLocaleString()} Ixis · $${Math.round(totalDollars).toLocaleString()}`,
      isEnterprise,
    };
  }, [tiers, count]);

  return (
    <div className="glass mx-auto max-w-4xl rounded-3xl p-6 sm:p-10">
      <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan">Volume Pricing</p>
          <h3 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
            Pay for what you process.
          </h3>
          <p className="mt-1 text-sm text-ink-2">
            No monthly seat tax. Move the slider or type a track count.
          </p>
        </div>
        <div className="text-right">
          <span className="font-mono text-xs uppercase tracking-widest text-ink-3">Rate per track</span>
          <p className="grad-text font-display text-4xl font-extrabold">{quote.rateFormatted}</p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="track-range" className="text-xs font-medium uppercase tracking-wider text-ink-3">
            Tracks to analyze
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={2000000}
              value={count}
              onChange={(e) => {
                const val = Math.max(1, Math.min(2000000, Number(e.target.value) || 1));
                setCount(val);
              }}
              className="input w-36 py-1.5 text-right font-mono text-sm font-semibold"
            />
            <span className="text-xs text-ink-3">tracks</span>
          </div>
        </div>

        <input
          id="track-range"
          type="range"
          min={1}
          max={100000}
          step={50}
          value={Math.min(100000, count)}
          onChange={(e) => setCount(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-cyan"
          aria-label="Track volume slider"
        />

        <div className="flex justify-between font-mono text-[11px] text-ink-3">
          <span>1 song (300 Ixis · $3)</span>
          <span>1k (75 Ixis · $0.75)</span>
          <span>10k (40 Ixis · $0.40)</span>
          <span>100k+ (20 Ixis · $0.20)</span>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 border-t border-line pt-6 sm:grid-cols-3">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
          <p className="text-xs text-ink-3">Volume tier</p>
          <p className="mt-1 font-display text-lg font-bold">
            {quote.tier.max_songs ? `${quote.tier.min_songs.toLocaleString()} – ${quote.tier.max_songs.toLocaleString()}` : "1M+ Enterprise"}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
          <p className="text-xs text-ink-3">Unit rate</p>
          <p className="mt-1 font-display text-lg font-bold text-cyan">{quote.rateFormatted} / track</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
          <p className="text-xs text-ink-3">Estimated total</p>
          <p className="grad-text mt-1 font-display text-lg font-bold">{quote.totalFormatted}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-2">
        <div>
          <p className="text-xs text-ink-3 mb-1">
            Lyrixis uses <span className="font-semibold text-cyan">Ixis points</span>. 100 Ixis = $1. Paid Ixis never expires.
          </p>
          <p className="text-xs text-ink-3">
            Single songs can be processed instantly. High-volume runs use API or batch CSV.
          </p>
        </div>
        <Link
          href={quote.isEnterprise ? "/waitlist" : "/add"}
          className="btn-primary px-5 py-2.5 text-sm"
        >
          {quote.isEnterprise ? "Talk to Enterprise" : "Redeem Ixis"} <span className="arrow">→</span>
        </Link>
      </div>
    </div>
  );
}
