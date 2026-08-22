"use client";

import { useEffect, useRef, useState } from "react";
import { LyricLine } from "@/types";

interface Props {
  lines: LyricLine[];
  audioUrl?: string;
}

export function SyncedLyrics({ lines, audioUrl }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentMs(audio.currentTime * 1000);
    audio.addEventListener("timeupdate", onTime);
    return () => audio.removeEventListener("timeupdate", onTime);
  }, [audioUrl]);

  const seek = (ms: number) => {
    const audio = audioRef.current;
    if (audio && audioUrl) {
      audio.currentTime = ms / 1000;
      setCurrentMs(ms);
    }
  };

  return (
    <div className="space-y-4">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          controls
          className="w-full"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
      )}

      <div className="max-h-[480px] space-y-3 overflow-y-auto rounded-xl border border-line bg-[#0c0a14] p-4">
        {lines.length === 0 ? (
          <p className="text-ink-3">Lyrics will appear when processing completes.</p>
        ) : (
          lines.map((line) => {
            const active =
              currentMs >= line.startMs - 200 && currentMs <= line.endMs + 300;
            const lowConf = line.confidence < 0.8;
            return (
              <div
                key={line.lineIndex}
                className={`rounded-lg px-3 py-2 transition ${
                  active ? "bg-violet/20" : "hover:bg-surface"
                } ${lowConf ? "border-l-2 border-amber-500" : ""}`}
              >
                <p className="text-lg leading-relaxed">
                  {line.words.map((w, wi) => {
                    const lit =
                      currentMs >= w.startMs && currentMs < w.endMs;
                    return (
                      <span
                        key={wi}
                        className={`cursor-pointer transition ${
                          lit ? "grad-text font-semibold" : "text-ink"
                        } ${w.confidence < 0.8 ? "underline decoration-amber-500/50" : ""}`}
                        onClick={() => seek(w.startMs)}
                      >
                        {w.text}{" "}
                      </span>
                    );
                  })}
                </p>
                <p className="mt-1 font-mono text-xs text-ink-3">
                  {formatTime(line.startMs)} — {formatTime(line.endMs)}
                  {lowConf && " · review suggested"}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
