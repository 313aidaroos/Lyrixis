"use client";

import { useState } from "react";
import { GlowCard, Reveal } from "@/components/Motion";

const CAPS = [
  { icon: "≋", label: "Transcribe & Sync", what: "Word-level synchronized lyrics from your recording." },
  { icon: "◎", label: "Detect Language & Dialect", what: "Language and regional dialect with a confidence score." },
  { icon: "⇄", label: "Translate & Transliterate", what: "Line-aligned translations and phonetic transliterations." },
  { icon: "▤", label: "Identify Structure", what: "Verse, chorus, bridge, and hook — mapped to time." },
  { icon: "◐", label: "Detect Explicit Content", what: "Clean / explicit flags with per-line evidence." },
  { icon: "◈", label: "Enrich Metadata", what: "ISRC, ISWC, UPC, writers, and splits validated." },
  { icon: "⤓", label: "Export in Every Format", what: "LRC, SRT, TTML, JSON, TXT — distribution-ready." },
];

export function CapabilityStrip() {
  const [active, setActive] = useState<number | null>(null);
  return (
    <div className="mx-auto max-w-7xl px-6">
      <Reveal>
        <div className="flex snap-x gap-3 overflow-x-auto pb-4 lg:grid lg:grid-cols-7 lg:overflow-visible">
          {CAPS.map((cap, i) => (
            <div
              key={cap.label}
              className="min-w-[210px] snap-start lg:min-w-0"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            >
              <GlowCard className="h-full p-4" tilt={4}>
                <div className="grad-text text-2xl leading-none" aria-hidden="true">
                  {cap.icon}
                </div>
                <p className="mt-3 text-sm font-semibold leading-snug">{cap.label}</p>
                <p
                  className={`mt-2 text-xs text-ink-2 transition-all duration-300 ${
                    active === i ? "max-h-16 opacity-100" : "max-h-0 opacity-0 lg:max-h-0"
                  } overflow-hidden`}
                >
                  {cap.what}
                </p>
              </GlowCard>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  );
}
