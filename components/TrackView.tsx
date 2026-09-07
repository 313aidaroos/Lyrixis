"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfidenceBadge, StatusBadge } from "@/components/StatusBadge";
import { SyncedLyrics } from "@/components/SyncedLyrics";
import type { ExportFormat, TrackDetail } from "@/types";

const TERMINAL = new Set(["completed", "failed", "manual_review"]);

export function TrackView({ publicId }: { publicId: string }) {
  const [track, setTrack] = useState<TrackDetail | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [tab, setTab] = useState<"synced" | "edit" | "exports">("synced");

  const load = useCallback(async () => {
    const response = await fetch(`/api/tracks/${publicId}`);
    const json = (await response.json()) as { track?: TrackDetail; error?: { message: string } };
    if (!response.ok || !json.track) {
      throw new Error(json.error?.message ?? "Could not load track.");
    }
    setTrack(json.track);
    return json.track;
  }, [publicId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const current = await load();
        if (cancelled) return;
        const audio = await fetch(`/api/tracks/${current.publicId}/audio`);
        if (audio.ok) {
          const payload = (await audio.json()) as { url?: string };
          if (payload.url && !cancelled) setAudioUrl(payload.url);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Load failed.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    if (!track || TERMINAL.has(track.status)) return;
    const timer = window.setInterval(() => {
      void load().catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [track, load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      setCheckoutNotice("Payment received. Unlocking as soon as Stripe confirms the webhook.");
    }
    if (params.get("checkout") === "cancelled") {
      setCheckoutNotice("Checkout cancelled. Your preview is still here.");
    }
  }, []);

  async function pay() {
    setPaying(true);
    setError(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: publicId }),
      });
      const json = (await response.json()) as { url?: string; error?: { message: string } };
      if (!response.ok || !json.url) {
        throw new Error(json.error?.message ?? "Could not start checkout.");
      }
      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setPaying(false);
    }
  }

  async function saveLine(lineIndex: number, text: string) {
    const response = await fetch(`/api/tracks/${publicId}/corrections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines: [{ lineIndex, text }] }),
    });
    const json = (await response.json()) as { error?: { message: string } };
    if (!response.ok) {
      throw new Error(json.error?.message ?? "Correction failed.");
    }
    await load();
  }

  async function download(format: ExportFormat) {
    const response = await fetch(`/api/tracks/${publicId}/exports?format=${format}`);
    if (!response.ok) {
      const json = (await response.json()) as { error?: { message: string } };
      setError(json.error?.message ?? "Export failed.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${publicId}.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (error && !track) {
    return <p className="text-rose-300">{error}</p>;
  }
  if (!track) {
    return <p className="text-ink-3">Loading…</p>;
  }

  const ready = track.status === "completed" || track.status === "manual_review";

  return (
    <div className="space-y-6">
      <header className="page-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-ink-3">{track.publicId}</p>
            <h1 className="mt-2 font-display text-4xl font-bold">{track.title ?? "Untitled"}</h1>
            <p className="mt-1 text-ink-2">{track.artist ?? "Unknown artist"}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={track.status} />
            <ConfidenceBadge band={track.confidenceBand} />
          </div>
        </div>
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-ink-3">Duration</dt>
            <dd>{track.durationSeconds ? `${Math.round(track.durationSeconds)}s` : "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-3">Language</dt>
            <dd>
              {track.language ?? "—"}
              {track.dialect ? ` · ${track.dialect}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-ink-3">Access</dt>
            <dd>{track.paid ? "Unlocked" : "Preview (30s)"}</dd>
          </div>
        </dl>
        {track.errorMessage && <p className="mt-4 text-sm text-rose-300">{track.errorMessage}</p>}
        {checkoutNotice && <p className="mt-4 text-sm text-cyan-300">{checkoutNotice}</p>}
        {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
        {ready && !track.paid && (
          <button className="btn-primary mt-6" type="button" disabled={paying} onClick={() => void pay()}>
            {paying ? "Redirecting…" : "Unlock full lyrics — pay $2.99"}
          </button>
        )}
      </header>

      {ready && (
        <div className="flex gap-2">
          <button
            type="button"
            className={tab === "synced" ? "btn-primary" : "btn-secondary"}
            onClick={() => setTab("synced")}
          >
            Synced
          </button>
          <button
            type="button"
            className={tab === "edit" ? "btn-primary" : "btn-secondary"}
            onClick={() => setTab("edit")}
          >
            Correct
          </button>
          <button
            type="button"
            className={tab === "exports" ? "btn-primary" : "btn-secondary"}
            onClick={() => setTab("exports")}
          >
            Exports
          </button>
        </div>
      )}

      {tab !== "exports" && (
        <SyncedLyrics
          lines={track.lines}
          audioUrl={audioUrl}
          preview={track.preview}
          previewMs={30_000}
          editable={tab === "edit" && track.paid}
          onSaveLine={saveLine}
        />
      )}

      {tab === "edit" && !track.paid && ready && (
        <p className="text-sm text-ink-3">Unlock the track to save inline corrections as a new transcription version.</p>
      )}

      {tab === "exports" && (
        <div className="card space-y-3">
          {track.paid ? (
            <>
              <p className="text-ink-2">Download the current transcription.</p>
              <div className="flex flex-wrap gap-3">
                {(["txt", "srt", "lrc", "json"] as ExportFormat[]).map((format) => (
                  <button key={format} className="btn-secondary" type="button" onClick={() => void download(format)}>
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-ink-2">Exports unlock after payment. TXT, SRT, LRC, and JSON.</p>
          )}
        </div>
      )}
    </div>
  );
}
