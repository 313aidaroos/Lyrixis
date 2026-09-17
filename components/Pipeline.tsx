"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/Motion";

const STAGES = ["Recording", "Transcription", "Synchronization", "Language", "Translation", "Metadata", "Validation", "Export"];

/** Energy moves along the pipeline as the user scrolls it through the viewport. */
export function Pipeline() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setProgress(1);
      return;
    }
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = 1 - (rect.top - vh * 0.15) / (vh * 0.7);
      setProgress(Math.min(1, Math.max(0, p)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const lit = Math.floor(progress * STAGES.length + 0.001);

  return (
    <div ref={ref} className="mx-auto max-w-7xl px-6">
      <Reveal className="text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink-3">From audio to intelligence</p>
        <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
          One recording in. <span className="grad-text">Structured intelligence</span> out.
        </h2>
      </Reveal>
      <div className="relative mt-12">
        <div className="absolute left-0 right-0 top-6 hidden h-px lg:block" style={{ background: "rgba(168,150,255,0.15)" }} />
        <div
          className="absolute left-0 top-6 hidden h-px lg:block"
          style={{
            width: `${progress * 100}%`,
            background: "var(--spectrum)",
            boxShadow: "0 0 18px rgba(139,92,246,0.7)",
            transition: "width 0.2s linear",
          }}
        />
        <ol className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-8">
          {STAGES.map((stage, i) => {
            const on = i < lit;
            return (
              <li key={stage} className="relative flex flex-col items-center text-center">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-full border text-sm font-semibold transition-all duration-500 ${
                    on ? "border-transparent text-white" : "border-line text-ink-3"
                  }`}
                  style={
                    on
                      ? { background: "var(--spectrum)", boxShadow: "0 0 30px rgba(139,92,246,0.55)" }
                      : { background: "rgba(16,15,42,0.7)" }
                  }
                >
                  {i + 1}
                </span>
                <p className={`mt-3 text-sm transition-colors ${on ? "text-ink" : "text-ink-3"}`}>{stage}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
