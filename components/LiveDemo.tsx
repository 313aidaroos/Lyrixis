"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

/* Demo uses a public-domain hymn (Amazing Grace, John Newton, 1779) so the sync is real, not mocked. */
const LINES = [
  { t: 0, text: "Amazing grace! How sweet the sound", section: "Verse 1" },
  { t: 3.2, text: "That saved a wretch like me.", section: "Verse 1" },
  { t: 6.4, text: "I once was lost, but now am found;", section: "Verse 1" },
  { t: 9.6, text: "Was blind, but now I see.", section: "Verse 1" },
  { t: 13.0, text: "'Twas grace that taught my heart to fear,", section: "Verse 2" },
  { t: 16.2, text: "And grace my fears relieved;", section: "Verse 2" },
  { t: 19.4, text: "How precious did that grace appear", section: "Verse 2" },
  { t: 22.6, text: "The hour I first believed.", section: "Verse 2" },
];
const DURATION = 26;

const STEPS = [
  { at: 0, label: "Ingest", detail: "Rights confirmed · public domain" },
  { at: 0.4, label: "Transcribe", detail: "Language: en · confidence 0.97" },
  { at: 1.0, label: "Align", detail: "8 lines · word timings" },
  { at: 1.6, label: "Structure", detail: "Verse 1 → Verse 2" },
  { at: 2.2, label: "Identify", detail: "ISWC / ISRC lookup · writers: John Newton" },
  { at: 2.8, label: "Export", detail: "LRC · SRT · JSON · TXT" },
];

function lrcStamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `[${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}]`;
}

export function LiveDemo() {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [phase, setPhase] = useState<"idle" | "processing" | "ready">("idle");
  const [procT, setProcT] = useState(0);
  const raf = useRef<number | null>(null);
  const start = useRef<number>(0);

  // processing animation
  useEffect(() => {
    if (phase !== "processing") return;
    const began = performance.now();
    let id = 0;
    const tick = () => {
      const t = (performance.now() - began) / 1000;
      setProcT(t);
      if (t >= 3.2) {
        setPhase("ready");
        setPlaying(true);
        return;
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [phase]);

  // playback clock
  useEffect(() => {
    if (!playing) {
      if (raf.current) cancelAnimationFrame(raf.current);
      return;
    }
    start.current = performance.now() - time * 1000;
    const tick = () => {
      const t = (performance.now() - start.current) / 1000;
      if (t >= DURATION) {
        setTime(DURATION);
        setPlaying(false);
        return;
      }
      setTime(t);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const activeIndex = useMemo(() => {
    let idx = -1;
    LINES.forEach((line, i) => {
      if (time >= line.t) idx = i;
    });
    return idx;
  }, [time]);

  const lrc = useMemo(() => LINES.map((l) => `${lrcStamp(l.t)}${l.text}`).join("\n"), []);

  function run() {
    setTime(0);
    setPlaying(false);
    setProcT(0);
    setPhase("processing");
  }

  function reset() {
    setPlaying(false);
    setTime(0);
    setPhase("idle");
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-3">Live demo</p>
          <h3 className="mt-1 font-display text-xl font-semibold">Amazing Grace · Traditional · 1779</h3>
          <p className="text-xs text-ink-3">Public-domain work — real sync, no mocked lyrics.</p>
        </div>
        <div className="flex gap-2">
          {phase === "idle" && (
            <button type="button" onClick={run} className="btn-primary btn-pulse px-5 py-2 text-sm">
              ▶ Analyze this track
            </button>
          )}
          {phase === "ready" && (
            <>
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className="btn-primary px-5 py-2 text-sm"
              >
                {playing ? "❚❚ Pause" : time >= DURATION ? "↺ Replay" : "▶ Play"}
              </button>
              <button type="button" onClick={reset} className="btn-secondary px-4 py-2 text-sm">
                Reset
              </button>
            </>
          )}
        </div>
      </div>

      {phase === "idle" && (
        <div className="grid gap-4 px-5 py-8 text-center">
          <p className="mx-auto max-w-lg text-ink-2">
            Watch one recording go from raw audio to synced lyrics, structure, identifiers, and exports.
            Press <span className="font-medium text-ink">Analyze</span>.
          </p>
        </div>
      )}

      {phase === "processing" && (
        <ol className="grid gap-2 px-5 py-6 sm:grid-cols-3">
          {STEPS.map((step) => {
            const done = procT >= step.at + 0.5;
            const active = procT >= step.at && !done;
            return (
              <li
                key={step.label}
                className={`rounded-xl border px-4 py-3 text-sm transition ${
                  done
                    ? "border-violet/40 bg-violet/5"
                    : active
                      ? "border-cyan bg-cyan/5"
                      : "border-line opacity-50"
                }`}
              >
                <p className="font-medium">
                  {done ? "✓ " : active ? "… " : "○ "}
                  {step.label}
                </p>
                <p className="text-xs text-ink-3">{step.detail}</p>
              </li>
            );
          })}
        </ol>
      )}

      {phase === "ready" && (
        <div className="grid gap-0 lg:grid-cols-[1.3fr_1fr]">
          <div className="border-b border-line px-5 py-5 lg:border-b-0 lg:border-r">
            <div className="mb-3 flex items-center justify-between text-xs text-ink-3">
              <span>Synced lyrics</span>
              <span className="font-mono">
                {time.toFixed(1)}s / {DURATION}s
              </span>
            </div>
            <div className="relative mb-4 h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full"
                style={{ width: `${(time / DURATION) * 100}%`, background: "var(--spectrum)" }}
              />
            </div>
            <div className="space-y-1.5">
              {LINES.map((line, i) => {
                const active = i === activeIndex;
                const past = i < activeIndex;
                return (
                  <div
                    key={i}
                    className={`rounded-lg px-3 py-2 text-base transition-all ${
                      active
                        ? "scale-[1.02] bg-gradient-to-r from-violet/15 to-cyan/15 font-semibold text-ink"
                        : past
                          ? "text-ink-3"
                          : "text-ink-2"
                    }`}
                  >
                    <span className="mr-3 font-mono text-[11px] text-ink-3">{lrcStamp(line.t)}</span>
                    {line.text}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 px-5 py-5 text-sm">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-ink-3">Structure</p>
              <div className="mt-2 flex gap-1">
                <div
                  className={`h-8 flex-1 rounded-l-lg border text-center text-xs leading-8 ${
                    time < 13 ? "border-violet bg-violet/10 font-medium" : "border-line"
                  }`}
                >
                  Verse 1
                </div>
                <div
                  className={`h-8 flex-1 rounded-r-lg border text-center text-xs leading-8 ${
                    time >= 13 ? "border-cyan bg-cyan/10 font-medium" : "border-line"
                  }`}
                >
                  Verse 2
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-ink-3">Language</p>
                <p className="mt-1 font-medium">English · 0.97</p>
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-ink-3">Explicit</p>
                <p className="mt-1 font-medium">Clean</p>
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-ink-3">Writers</p>
                <p className="mt-1 font-medium">John Newton</p>
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-ink-3">License</p>
                <p className="mt-1 font-medium">Public domain</p>
              </div>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-ink-3">Exports</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  className="btn-secondary px-3 py-1.5 text-xs"
                  href={`data:text/plain;charset=utf-8,${encodeURIComponent(lrc)}`}
                  download="amazing-grace.lrc"
                >
                  ⬇ LRC
                </a>
                <a
                  className="btn-secondary px-3 py-1.5 text-xs"
                  href={`data:application/json;charset=utf-8,${encodeURIComponent(
                    JSON.stringify({ title: "Amazing Grace", writers: ["John Newton"], lines: LINES }, null, 2)
                  )}`}
                  download="amazing-grace.json"
                >
                  ⬇ JSON
                </a>
                <a
                  className="btn-secondary px-3 py-1.5 text-xs"
                  href={`data:text/plain;charset=utf-8,${encodeURIComponent(LINES.map((l) => l.text).join("\n"))}`}
                  download="amazing-grace.txt"
                >
                  ⬇ TXT
                </a>
              </div>
            </div>
            <Link href="/catalog/rec_amazing_grace" className="text-violet hover:underline">
              Open this recording in the catalog →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
