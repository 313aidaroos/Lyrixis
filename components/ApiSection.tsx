"use client";

import Link from "next/link";
import { useState } from "react";
import { Reveal } from "@/components/Motion";

const CODE_EXAMPLE = `curl -X POST https://api.lyrixis.dev/v1/tracks \\
  -H "Authorization: Bearer lx_live_948f..." \\
  -F "file=@master.wav" \\
  -F "isrc=USRC12401824" \\
  -F "confirm_rights=true"`;

const RESPONSE_EXAMPLE = `{
  "id": "trx_9f48ac10e2",
  "status": "completed",
  "isrc": "USRC12401824",
  "language": "ar",
  "dialect": "Yemeni Arabic",
  "confidence": 0.982,
  "lyrics_synced": true,
  "lines_count": 32,
  "structure": ["intro", "verse", "chorus", "verse", "chorus", "outro"],
  "exports": {
    "lrc": "https://api.lyrixis.dev/v1/tracks/trx_9f48ac10e2/exports/lrc",
    "ttml": "https://api.lyrixis.dev/v1/tracks/trx_9f48ac10e2/exports/ttml",
    "json": "https://api.lyrixis.dev/v1/tracks/trx_9f48ac10e2/exports/json"
  }
}`;

export function ApiSection() {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(CODE_EXAMPLE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div id="api" className="mx-auto max-w-7xl px-6">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <Reveal>
          <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.24em] text-cyan">
            <span>●</span> Developer First
          </div>
          <h2 className="mt-3 font-display text-4xl font-bold leading-tight sm:text-5xl">
            Music intelligence <br />
            <span className="grad-text">through one API.</span>
          </h2>
          <p className="mt-4 max-w-lg text-lg text-ink-2">
            Send raw audio. Get normalized ISRC bindings, word-level time codes, dialect confidence, and DSP-ready exports. Fully headless, sub-second responses on indexed catalogs.
          </p>

          <div className="mt-8 space-y-3">
            {[
              "Single-track and bulk multi-part uploads with rights gating",
              "Streaming webhook events: queued → transcribing → completed",
              "Direct exports for Apple Music (TTML), Spotify (LRC/JSON), and broadcast (SRT)",
              "Deterministic pricing: billed strictly on audio minutes processed",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 text-sm text-ink-2">
                <span className="grad-text mt-0.5 text-base font-bold">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/waitlist" className="btn-primary">
              Explore the API <span className="arrow">→</span>
            </Link>
            <Link href="/catalog" className="btn-secondary">
              Browse API Catalog
            </Link>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="glass overflow-hidden rounded-3xl border border-line">
            <div className="flex items-center justify-between border-b border-line px-5 py-3 text-xs text-ink-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-mono text-ink-2">POST /v1/tracks</span>
              </div>
              <button
                type="button"
                onClick={copy}
                className="font-mono hover:text-cyan transition"
                aria-label="Copy code"
              >
                {copied ? "Copied ✓" : "Copy cURL"}
              </button>
            </div>

            <div className="p-5 font-mono text-xs leading-relaxed">
              <p className="text-ink-3">{"// Request"}</p>
              <pre className="mt-1 text-cyan overflow-x-auto whitespace-pre-wrap">{CODE_EXAMPLE}</pre>

              <div className="my-4 border-t border-line/60" />

              <p className="text-ink-3">{"// 200 OK (application/json)"}</p>
              <pre className="mt-1 text-ink-2 overflow-x-auto">{RESPONSE_EXAMPLE}</pre>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
