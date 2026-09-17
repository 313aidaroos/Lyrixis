"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const DEMO_LYRICS = [
  { t: 0, text: "City lights, they fade away" },
  { t: 4.2, text: "But the music still remains" },
  { t: 8.5, text: "In the silence, we collide" },
  { t: 12.8, text: "Through the dark, we find a way" },
];

const DURATION = 18;
const BARS = 48;

function stamp(s: number) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function SongDemo() {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(4.6); // Start at ~4.6s so "But the music still remains" is lit on initial load (matching mockup)
  const raf = useRef(0);
  const origin = useRef(0);

  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(raf.current);
      return;
    }
    origin.current = performance.now() - time * 1000;
    const tick = () => {
      const t = (performance.now() - origin.current) / 1000;
      if (t >= DURATION) {
        setTime(DURATION);
        setPlaying(false);
        return;
      }
      setTime(t);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, time]);

  const activeIndex = useMemo(() => {
    let idx = 0;
    DEMO_LYRICS.forEach((line, i) => {
      if (time >= line.t) idx = i;
    });
    return idx;
  }, [time]);

  const progress = Math.min(1, Math.max(0, time / DURATION));
  const bars = useMemo(
    () => Array.from({ length: BARS }, (_, i) => 0.28 + Math.abs(Math.sin(i * 0.42) * Math.cos(i * 0.28)) * 0.72),
    []
  );

  function toggle() {
    if (time >= DURATION) setTime(0);
    setPlaying((p) => !p);
  }

  return (
    <div className="glass overflow-hidden rounded-3xl p-6 sm:p-8">
      <div className="grid items-center gap-8 lg:grid-cols-[240px_1.4fr_1.2fr]">
        {/* LEFT: artwork + meta + play/pause */}
        <div className="flex flex-col items-center text-center sm:flex-row sm:text-left lg:flex-col lg:items-start">
          <div className="relative h-44 w-44 flex-shrink-0 overflow-hidden rounded-2xl border border-line shadow-2xl shadow-violet/20">
            <img
              src="/demo-midnight-echoes.jpg"
              alt="Midnight Echoes album artwork"
              className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <button
              type="button"
              onClick={toggle}
              className="btn-primary btn-pulse absolute bottom-3 right-3 h-11 w-11 rounded-full p-0 text-base shadow-lg"
              aria-label={playing ? "Pause" : "Play demo"}
            >
              {playing ? "❚❚" : "▶"}
            </button>
          </div>

          <div className="mt-4 sm:ml-5 sm:mt-0 lg:ml-0 lg:mt-4">
            <span className="inline-block rounded-full border border-cyan/30 bg-cyan/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan">
              Live Demo
            </span>
            <h4 className="mt-1.5 font-display text-xl font-bold text-ink">Midnight Echoes</h4>
            <p className="text-xs text-ink-2">Lyrixis Demo Label · 2026</p>
            <p className="mt-1 font-mono text-[11px] text-ink-3">ISRC: USLX22600142</p>
          </div>
        </div>

        {/* CENTER: animated waveform + progress */}
        <div className="flex flex-col justify-center border-t border-line/60 pt-6 sm:border-t-0 sm:pt-0">
          <div className="flex h-28 items-end gap-[3px] px-1" aria-hidden="true">
            {bars.map((h, i) => {
              const pos = i / BARS;
              const reached = pos <= progress;
              const dynamic = playing ? 0.75 + Math.sin(time * 7 + i * 0.4) * 0.25 : 0.65;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-full transition-[height] duration-150"
                  style={{
                    height: `${Math.max(8, h * 100 * dynamic)}%`,
                    background: reached ? "var(--spectrum)" : "rgba(168,150,255,0.18)",
                    boxShadow: reached && playing ? "0 0 10px rgba(139,92,246,0.5)" : "none",
                  }}
                />
              );
            })}
          </div>

          <div className="mt-4">
            <div
              className="relative h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-white/10"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickPos = (e.clientX - rect.left) / rect.width;
                setTime(clickPos * DURATION);
              }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${progress * 100}%`, background: "var(--spectrum)" }}
              />
            </div>
            <div className="mt-2 flex justify-between font-mono text-xs text-ink-3">
              <span>{stamp(time)}</span>
              <span className="text-cyan font-semibold">44.1 kHz · 24-bit PCM</span>
              <span>{stamp(DURATION)}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line/60 pt-3 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-ink-3">Language</p>
              <p className="font-mono text-xs font-semibold text-ink">EN (0.98)</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-ink-3">Loudness</p>
              <p className="font-mono text-xs font-semibold text-cyan">-14.2 LUFS</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-ink-3">Structure</p>
              <p className="font-mono text-xs font-semibold text-violet">Verse 1</p>
            </div>
          </div>
        </div>

        {/* RIGHT: synchronized lyrics */}
        <div className="flex flex-col justify-center border-t border-line/60 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <div className="space-y-3">
            {DEMO_LYRICS.map((line, i) => {
              const isCurrent = i === activeIndex;
              const isPast = i < activeIndex;
              return (
                <div
                  key={line.text}
                  className={`rounded-xl px-3.5 py-2 transition-all duration-300 ${
                    isCurrent
                      ? "bg-white/10 shadow-lg shadow-violet/10 font-bold text-ink scale-[1.03]"
                      : isPast
                        ? "text-ink-3"
                        : "text-ink-2"
                  }`}
                >
                  <p className="text-sm sm:text-base leading-snug">
                    {isCurrent ? <span className="grad-text">{line.text}</span> : line.text}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-line/60 flex items-center justify-between">
            <span className="text-xs text-ink-3">Word-level timecodes active</span>
            <Link href="/catalog" className="btn-secondary px-3.5 py-1.5 text-xs font-semibold">
              See the full result <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
