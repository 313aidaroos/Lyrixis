"use client";

import { useEffect, useRef, useState } from "react";
import type { LyricLine } from "@/types";

interface Props {
  lines: LyricLine[];
  audioUrl?: string | null;
  preview: boolean;
  previewMs: number;
  editable: boolean;
  onSaveLine?: (lineIndex: number, text: string) => Promise<void>;
}

export function SyncedLyrics({ lines, audioUrl, preview, previewMs, editable, onSaveLine }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      const ms = audio.currentTime * 1000;
      if (preview && ms > previewMs) {
        audio.currentTime = previewMs / 1000;
        audio.pause();
        setCurrentMs(previewMs);
        return;
      }
      setCurrentMs(ms);
    };
    audio.addEventListener("timeupdate", onTime);
    return () => audio.removeEventListener("timeupdate", onTime);
  }, [audioUrl, preview, previewMs]);

  const seek = (ms: number) => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    const next = preview ? Math.min(ms, previewMs) : ms;
    audio.currentTime = next / 1000;
    setCurrentMs(next);
  };

  return (
    <div className="space-y-4">
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} controls className="w-full" />
      )}
      {preview && (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
          PREVIEW — first 30 seconds of lyrics, watermarked. Pay to unlock the full result and exports.
        </p>
      )}
      <div className="max-h-[520px] space-y-3 overflow-y-auto rounded-xl border border-line bg-[#0c0a14] p-4">
        {lines.length === 0 ? (
          <p className="text-ink-3">Lyrics appear when processing completes.</p>
        ) : (
          lines.map((line) => {
            const active = currentMs >= line.startMs - 200 && currentMs <= line.endMs + 300;
            const text = drafts[line.lineIndex] ?? line.text;
            return (
              <div
                key={line.lineIndex}
                className={`rounded-lg px-3 py-2 transition ${active ? "bg-violet/20" : "hover:bg-surface"} ${
                  line.isLowConfidence ? "border-l-2 border-amber-500" : ""
                }`}
              >
                {editable ? (
                  <textarea
                    className="input min-h-[2.5rem] resize-y"
                    value={text}
                    onChange={(event) =>
                      setDrafts((current) => ({ ...current, [line.lineIndex]: event.target.value }))
                    }
                    onBlur={() => {
                      if (!onSaveLine) return;
                      const next = (drafts[line.lineIndex] ?? line.text).trim();
                      if (next === line.text) return;
                      setSaving(line.lineIndex);
                      void onSaveLine(line.lineIndex, next).finally(() => setSaving(null));
                    }}
                  />
                ) : (
                  <p className="text-lg leading-relaxed">
                    {line.words.length > 0
                      ? line.words.map((word) => {
                          const lit = currentMs >= word.startMs && currentMs < word.endMs;
                          return (
                            <span
                              key={`${line.lineIndex}-${word.wordIndex}`}
                              className={`cursor-pointer transition ${
                                lit ? "grad-text font-semibold" : "text-ink"
                              } ${word.confidence < 0.8 ? "underline decoration-amber-500/50" : ""}`}
                              onClick={() => seek(word.startMs)}
                            >
                              {word.text}{" "}
                            </span>
                          );
                        })
                      : line.text}
                  </p>
                )}
                <p className="mt-1 font-mono text-xs text-ink-3">
                  {formatTime(line.startMs)} — {formatTime(line.endMs)}
                  {line.isLowConfidence && " · review suggested"}
                  {saving === line.lineIndex && " · saving"}
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
