"use client";
import { useState } from "react";
import { postAction } from "./client";

export function Audition({ voiceId, freePerDay, paidIxis, maxSeconds }: { voiceId: string; freePerDay: number; paidIxis: number; maxSeconds: number }) {
  const [text, setText] = useState("أهلاً بكم في Demo Co. — Welcome!");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ url: string; free: boolean; charged: number; freeLeft: number; isDemo: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="card p-5">
      <h3 className="font-display text-lg font-bold">Audition your line</h3>
      <p className="mt-1 text-xs text-ink-3">Up to {maxSeconds}s. {freePerDay} free per business per day, then {paidIxis} Ixis each from your Apixis Wallet.</p>
      <textarea dir="auto" value={text} onChange={(e) => setText(e.target.value)} maxLength={250} rows={3} aria-label="Audition text" className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm" />
      <div className="mt-3 flex items-center gap-3">
        <button disabled={busy || !text.trim()} className="btn-primary px-4 py-2 text-sm disabled:opacity-60" onClick={async () => {
          setBusy(true); setErr(null);
          const r = await postAction<{ url: string; free: boolean; charged: number; freeLeft: number; isDemo: boolean }>("audition", { voiceId, text });
          setBusy(false); if (r.ok) setOut(r.data); else setErr(r.message);
        }}>{busy ? "Generating…" : "Play audition"}</button>
        <span className="text-xs text-ink-3">{Array.from(text).length}/250</span>
      </div>
      {err && <p role="alert" className="mt-2 text-sm text-red-300">{err}</p>}
      {out && (
        <div className="mt-3 space-y-1">
          <audio controls preload="none" src={out.url} className="w-full" />
          <p className="text-xs text-ink-3">{out.free ? `Free audition · ${out.freeLeft} free left today` : `Charged ${out.charged} Ixis`}{out.isDemo ? " · demo audio (synthetic tone, not a real voice)" : ""}</p>
        </div>
      )}
    </div>
  );
}
