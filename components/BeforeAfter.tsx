"use client";

import { useState } from "react";
import { Reveal } from "@/components/Motion";

const BEFORE = ["Missing lyrics", "Unknown language", "Metadata conflicts", "No synchronized lyrics", "Incomplete fields"];
const AFTER = ["Synchronized lyrics", "Language detected", "Metadata validated", "Distribution-ready exports", "Catalog enriched"];

export function BeforeAfter() {
  const [v, setV] = useState(50);
  return (
    <div className="mx-auto max-w-7xl px-6">
      <Reveal className="text-center">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">
          Turn catalog chaos into <span className="grad-text">structured intelligence.</span>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-2">Drag to compare an unprocessed catalog with the same catalog after Lyrixis.</p>
      </Reveal>
      <Reveal delay={120} className="mt-10">
        <div className="glass relative overflow-hidden rounded-3xl">
          <div className="grid lg:grid-cols-2">
            <div className="relative p-6 sm:p-8" style={{ opacity: 0.35 + (1 - v / 100) * 0.65 }}>
              <p className="font-mono text-xs uppercase tracking-widest text-rose-300">Before Lyrixis</p>
              <ul className="mt-4 space-y-3">
                {BEFORE.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-ink-2">
                    <span className="h-2 w-2 rounded-full bg-rose-400/70" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative border-t border-line p-6 sm:p-8 lg:border-l lg:border-t-0" style={{ opacity: 0.35 + (v / 100) * 0.65 }}>
              <p className="font-mono text-xs uppercase tracking-widest text-cyan">After Lyrixis</p>
              <ul className="mt-4 space-y-3">
                {AFTER.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-ink">
                    <span className="grad-text font-bold">✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-line px-6 py-5 sm:px-8">
            <label className="flex items-center gap-4 text-xs text-ink-3">
              <span>Before</span>
              <input
                type="range"
                min={0}
                max={100}
                value={v}
                onChange={(e) => setV(Number(e.target.value))}
                aria-label="Compare before and after Lyrixis"
                className="flex-1 accent-violet"
              />
              <span>After</span>
            </label>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
