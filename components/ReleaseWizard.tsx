"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeIsrc, normalizeIswc, normalizeUpc } from "@/lib/music-ids";
import { splitsSchema } from "@/lib/release-schema";

const STEPS = ["Upload", "Transcribe", "Review lyrics", "Metadata", "Split sheet", "Pay & download"] as const;

interface LyricLineView {
  lineIndex: number;
  text: string;
  startMs: number;
  endMs: number;
}

interface SplitRow {
  name: string;
  role: string;
  percentage: string;
  email: string;
}

interface QuoteView {
  amountCents: number;
  rateCents: number;
}

function formatLrcPreview(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centis = Math.floor((ms % 1000) / 10);
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `[${pad(minutes)}:${pad(seconds)}.${pad(centis)}]`;
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const json = (await response.json()) as { error?: { message?: string }; message?: string };
    return json.error?.message ?? json.message ?? fallback;
  } catch {
    return fallback;
  }
}

export function ReleaseWizard({ initialTrackPublicId }: { initialTrackPublicId: string | null }) {
  const [step, setStep] = useState(initialTrackPublicId ? 1 : 0);
  const [trackPublicId, setTrackPublicId] = useState<string | null>(initialTrackPublicId);
  const [status, setStatus] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [lines, setLines] = useState<LyricLineView[]>([]);
  const [edited, setEdited] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [verifyChecked, setVerifyChecked] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadArtist, setUploadArtist] = useState("");
  const [rights, setRights] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [primaryArtist, setPrimaryArtist] = useState("");
  const [featured, setFeatured] = useState("");
  const [isrc, setIsrc] = useState("");
  const [iswc, setIswc] = useState("");
  const [upc, setUpc] = useState("");

  const [splits, setSplits] = useState<SplitRow[]>([{ name: "", role: "Writer", percentage: "100", email: "" }]);

  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [releaseId, setReleaseId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [insufficient, setInsufficient] = useState<{ needed: number; buyUrl: string } | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadLyrics = useCallback(async (publicId: string) => {
    const response = await fetch(`/api/tracks/${encodeURIComponent(publicId)}/lyrics`);
    if (!response.ok) throw new Error(await readError(response, "Could not load lyrics."));
    const json = (await response.json()) as {
      status: string;
      error_message: string | null;
      title: string | null;
      artist: string | null;
      lines: LyricLineView[];
    };
    setStatus(json.status);
    setStatusError(json.error_message);
    setLines(json.lines);
    if (!title && json.title) setTitle(json.title);
    if (!primaryArtist && json.artist) setPrimaryArtist(json.artist);
    return json;
  }, [title, primaryArtist]);

  // Transcribe step: poll until the pipeline finishes.
  useEffect(() => {
    if (step !== 1 || !trackPublicId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const json = await loadLyrics(trackPublicId);
        if (cancelled) return;
        if (json.status === "completed" || json.status === "manual_review") {
          if (pollTimer.current) clearInterval(pollTimer.current);
          setStep(2);
        } else if (json.status === "failed") {
          if (pollTimer.current) clearInterval(pollTimer.current);
          setStatusError(json.error_message ?? "Processing failed.");
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Polling failed.");
        if (pollTimer.current) clearInterval(pollTimer.current);
      }
    };
    void poll();
    pollTimer.current = setInterval(() => void poll(), 3000);
    return () => {
      cancelled = true;
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [step, trackPublicId, loadLyrics]);

  async function onUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!file) return setError("Choose an audio file.");
    if (!rights) return setError("You must confirm you have the rights to process this recording.");
    const data = new FormData();
    data.set("audio", file);
    data.set("title", uploadTitle);
    data.set("artist", uploadArtist);
    data.set("rights_confirmed", "true");
    setUploading(true);
    try {
      const response = await fetch("/api/tracks", { method: "POST", body: data });
      if (!response.ok) throw new Error(await readError(response, "Upload failed."));
      const json = (await response.json()) as { track_id: string };
      setTrackPublicId(json.track_id);
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function onSaveEdits() {
    if (!trackPublicId) return;
    const edits = Object.entries(edited)
      .filter(([, text]) => text.trim().length > 0)
      .map(([lineIndex, text]) => ({ lineIndex: Number(lineIndex), text: text.trim() }));
    setError(null);
    if (edits.length === 0) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/tracks/${encodeURIComponent(trackPublicId)}/corrections`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lines: edits }),
      });
      if (!response.ok) throw new Error(await readError(response, "Could not save edits."));
      setEdited({});
      await loadLyrics(trackPublicId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save edits.");
    } finally {
      setSaving(false);
    }
  }

  async function onVerify() {
    if (!trackPublicId || !verifyChecked) return;
    setError(null);
    setVerifying(true);
    try {
      const response = await fetch(`/api/tracks/${encodeURIComponent(trackPublicId)}/verify`, { method: "POST" });
      if (!response.ok) throw new Error(await readError(response, "Could not record verification."));
      setVerified(true);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record verification.");
    } finally {
      setVerifying(false);
    }
  }

  function codeError(raw: string, kind: "isrc" | "iswc" | "upc"): string | null {
    if (!raw.trim()) return null;
    try {
      if (kind === "isrc") normalizeIsrc(raw);
      if (kind === "iswc") normalizeIswc(raw);
      if (kind === "upc") normalizeUpc(raw);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "Invalid code.";
    }
  }

  const isrcError = codeError(isrc, "isrc");
  const iswcError = codeError(iswc, "iswc");
  const upcError = codeError(upc, "upc");
  const metadataValid =
    title.trim().length > 0 && primaryArtist.trim().length > 0 && !isrcError && !iswcError && !upcError;

  const parsedSplits = splits.map((row) => ({
    name: row.name.trim(),
    role: row.role.trim(),
    percentage: Number(row.percentage),
    email: row.email.trim(),
  }));
  const splitsCheck = splitsSchema.safeParse(parsedSplits);
  const splitsTotal = parsedSplits.reduce(
    (sum, row) => sum + (Number.isFinite(row.percentage) ? row.percentage : 0),
    0
  );

  function updateSplit(index: number, patch: Partial<SplitRow>) {
    setSplits((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  // Pay step: fetch the server-side USD quote for display (informational only —
  // the charged price is computed server-side at pay time).
  useEffect(() => {
    if (step !== 5 || quote) return;
    fetch("/api/quote?songs=1")
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response, "Could not load price."));
        return response.json();
      })
      .then((json: QuoteView) => setQuote(json))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load price."));
  }, [step, quote]);

  async function onPay() {
    if (!trackPublicId) return;
    setError(null);
    setInsufficient(null);
    setPaying(true);
    try {
      const createResponse = await fetch("/api/releases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          trackPublicId,
          metadata: {
            title: title.trim(),
            primaryArtist: primaryArtist.trim(),
            featuredArtists: featured.split(",").map((name) => name.trim()).filter(Boolean),
            releaseType: "single",
            isrc: isrc.trim(),
            iswc: iswc.trim(),
            upc: upc.trim(),
          },
          splits: parsedSplits,
        }),
      });
      if (!createResponse.ok) throw new Error(await readError(createResponse, "Could not create release."));
      const created = (await createResponse.json()) as { release_id: string };
      setReleaseId(created.release_id);

      const payResponse = await fetch(`/api/releases/${created.release_id}/pay`, {
        method: "POST",
        headers: { "x-idempotency-key": crypto.randomUUID() },
      });
      const payJson = (await payResponse.json()) as {
        success?: boolean;
        already?: boolean;
        receiptId?: string;
        error?: string;
        message?: string;
        needed?: number;
        buyUrl?: string;
      };
      if (!payResponse.ok) {
        if (payResponse.status === 402 && payJson.needed !== undefined && payJson.buyUrl) {
          setInsufficient({ needed: payJson.needed, buyUrl: payJson.buyUrl });
          return;
        }
        throw new Error(payJson.message ?? "Payment failed.");
      }
      setPaid(true);
      setReceiptId(payJson.receiptId ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setPaying(false);
    }
  }

  const lrcPreview = lines.slice(0, 12).map((line) => `${formatLrcPreview(line.startMs)}${line.text}`).join("\n");

  return (
    <div>
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={`rounded-full px-3 py-1 font-mono text-xs uppercase tracking-widest ${
              index === step ? "bg-white/10 text-ink" : index < step ? "bg-white/[0.03] text-ink-2" : "text-ink-3"
            }`}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {error && <p className="mt-6 text-sm text-rose-300">{error}</p>}

      {step === 0 && (
        <form className="page-panel mt-6 space-y-6" onSubmit={(event) => void onUpload(event)}>
          <div>
            <label className="label" htmlFor="release-audio">Audio file</label>
            <input
              id="release-audio"
              className="input"
              type="file"
              accept="audio/mpeg,audio/wav,audio/flac,audio/mp4,audio/x-m4a,audio/ogg,.mp3,.wav,.flac,.m4a,.ogg"
              required
              onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
            />
            <p className="mt-2 text-xs text-ink-3">MP3, WAV, FLAC, M4A, or OGG. Max 100 MB, 15 minutes.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="release-title">Song title</label>
              <input id="release-title" className="input" value={uploadTitle} onChange={(event) => setUploadTitle(event.currentTarget.value)} placeholder="Optional — read from tags if empty" />
            </div>
            <div>
              <label className="label" htmlFor="release-artist">Artist</label>
              <input id="release-artist" className="input" value={uploadArtist} onChange={(event) => setUploadArtist(event.currentTarget.value)} placeholder="Optional" />
            </div>
          </div>
          <label className="flex items-start gap-3 text-sm text-ink-2">
            <input type="checkbox" className="mt-1" checked={rights} onChange={(event) => setRights(event.currentTarget.checked)} required />
            <span>I confirm I have the rights to upload this recording and to generate lyrics from it.</span>
          </label>
          <button className="btn-primary" type="submit" disabled={uploading || !rights}>
            {uploading ? "Uploading…" : "Upload and start transcription"}
          </button>
        </form>
      )}

      {step === 1 && (
        <div className="page-panel mt-6 space-y-4">
          <p className="text-sm text-ink-2">
            {statusError
              ? `Transcription unavailable: ${statusError}`
              : `Transcribing… (${status ?? "starting"})`}
          </p>
          <p className="text-xs text-ink-3">
            This runs on the existing Lyrixis pipeline. If it stays stuck here, make sure the transcription
            provider keys are configured and the worker is running.
          </p>
          {statusError && (
            <button className="btn-secondary" type="button" onClick={() => setStep(0)}>
              Upload a different file
            </button>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="page-panel mt-6 space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold">Review the lyrics</h2>
            <p className="mt-1 text-sm text-ink-2">
              Fix anything the AI got wrong. Timestamps are shown for reference; only the text is editable.
            </p>
          </div>
          <div className="max-h-96 space-y-3 overflow-y-auto">
            {lines.map((line) => (
              <div key={line.lineIndex} className="grid grid-cols-[5.5rem_1fr] items-start gap-3">
                <span className="pt-2 font-mono text-xs text-ink-3">{formatLrcPreview(line.startMs)}</span>
                <input
                  className="input"
                  value={edited[line.lineIndex] ?? line.text}
                  onChange={(event) => setEdited((prev) => ({ ...prev, [line.lineIndex]: event.currentTarget.value }))}
                />
              </div>
            ))}
            {lines.length === 0 && <p className="text-sm text-ink-3">No lyric lines yet.</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="btn-secondary" type="button" disabled={saving || Object.keys(edited).length === 0} onClick={() => void onSaveEdits()}>
              {saving ? "Saving…" : "Save edits"}
            </button>
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-ink-2">LRC preview</summary>
            <pre className="mt-2 overflow-x-auto rounded bg-ink-3/10 p-3 font-mono text-xs text-ink-2">{lrcPreview || "—"}</pre>
          </details>
          <div className="border-t border-ink-3/20 pt-6">
            <label className="flex items-start gap-3 text-sm text-ink">
              <input type="checkbox" className="mt-1" checked={verifyChecked} onChange={(event) => setVerifyChecked(event.currentTarget.checked)} />
              <span>
                <strong>Lyrics verified.</strong> I have reviewed every line and the lyrics are correct.
                This confirmation is stored as a permanent verification record on the track.
              </span>
            </label>
            <button className="btn-primary mt-4" type="button" disabled={!verifyChecked || verifying} onClick={() => void onVerify()}>
              {verifying ? "Recording…" : "Confirm and continue"}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="page-panel mt-6 space-y-6">
          <h2 className="font-display text-xl font-bold">Release metadata</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="meta-title">Title *</label>
              <input id="meta-title" className="input" value={title} onChange={(event) => setTitle(event.currentTarget.value)} />
            </div>
            <div>
              <label className="label" htmlFor="meta-artist">Primary artist *</label>
              <input id="meta-artist" className="input" value={primaryArtist} onChange={(event) => setPrimaryArtist(event.currentTarget.value)} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="meta-featured">Featured artists (comma-separated)</label>
            <input id="meta-featured" className="input" value={featured} onChange={(event) => setFeatured(event.currentTarget.value)} placeholder="e.g. Jane Doe, John Smith" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="label" htmlFor="meta-isrc">ISRC</label>
              <input id="meta-isrc" className="input font-mono" value={isrc} onChange={(event) => setIsrc(event.currentTarget.value)} placeholder="US-ABC-26-00001" />
              {isrcError && <p className="mt-1 text-xs text-rose-300">{isrcError}</p>}
            </div>
            <div>
              <label className="label" htmlFor="meta-iswc">ISWC</label>
              <input id="meta-iswc" className="input font-mono" value={iswc} onChange={(event) => setIswc(event.currentTarget.value)} placeholder="T-000.000.001-0" />
              {iswcError && <p className="mt-1 text-xs text-rose-300">{iswcError}</p>}
            </div>
            <div>
              <label className="label" htmlFor="meta-upc">UPC / EAN</label>
              <input id="meta-upc" className="input font-mono" value={upc} onChange={(event) => setUpc(event.currentTarget.value)} placeholder="12–14 digits" />
              {upcError && <p className="mt-1 text-xs text-rose-300">{upcError}</p>}
            </div>
          </div>
          <p className="text-xs text-ink-3">
            Codes are optional — missing ones are flagged in your package. Codes are validated for format only;
            Lyrixis does not issue official ISRC/ISWC/UPC codes.
          </p>
          <button className="btn-primary" type="button" disabled={!metadataValid} onClick={() => setStep(4)}>
            Continue to split sheet
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="page-panel mt-6 space-y-6">
          <h2 className="font-display text-xl font-bold">Split sheet</h2>
          <p className="text-sm text-ink-2">Who owns what. Percentages must add up to exactly 100%.</p>
          <div className="space-y-3">
            {splits.map((row, index) => (
              <div key={index} className="grid gap-3 md:grid-cols-[1fr_1fr_6rem_1fr_auto]">
                <input className="input" placeholder="Name *" value={row.name} onChange={(event) => updateSplit(index, { name: event.currentTarget.value })} />
                <input className="input" placeholder="Role * (writer, producer…)" value={row.role} onChange={(event) => updateSplit(index, { role: event.currentTarget.value })} />
                <input className="input" placeholder="%" inputMode="decimal" value={row.percentage} onChange={(event) => updateSplit(index, { percentage: event.currentTarget.value })} />
                <input className="input" placeholder="Email (optional)" value={row.email} onChange={(event) => updateSplit(index, { email: event.currentTarget.value })} />
                <button className="btn-secondary" type="button" disabled={splits.length <= 1} onClick={() => setSplits((rows) => rows.filter((_, i) => i !== index))}>
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button className="btn-secondary" type="button" onClick={() => setSplits((rows) => [...rows, { name: "", role: "", percentage: "", email: "" }])}>
              Add collaborator
            </button>
            <span className={`font-mono text-sm ${Math.abs(splitsTotal - 100) < 0.001 ? "text-emerald-300" : "text-rose-300"}`}>
              Total: {Number.isFinite(splitsTotal) ? splitsTotal : "—"}%
            </span>
          </div>
          {!splitsCheck.success && (
            <p className="text-xs text-rose-300">{splitsCheck.error.issues[0]?.message}</p>
          )}
          <button className="btn-primary" type="button" disabled={!splitsCheck.success} onClick={() => setStep(5)}>
            Continue to payment
          </button>
        </div>
      )}

      {step === 5 && (
        <div className="page-panel mt-6 space-y-6">
          <h2 className="font-display text-xl font-bold">Pay & download</h2>
          {quote ? (
            <p className="text-sm text-ink-2">
              Release package: <strong className="text-ink">${(quote.amountCents / 100).toFixed(2)} USD</strong>,
              charged in Ixis from your Apixis Wallet. The exact Ixis amount comes from the Wallet at pay time —
              this page never computes the charged price.
            </p>
          ) : (
            <p className="text-sm text-ink-3">Loading price…</p>
          )}
          {!paid && (
            <button className="btn-primary" type="button" disabled={paying || !quote} onClick={() => void onPay()}>
              {paying ? "Processing payment…" : "Create release & pay with Ixis"}
            </button>
          )}
          {insufficient && (
            <div className="rounded border border-amber-300/30 p-4 text-sm">
              <p className="text-ink">Not enough Ixis — this release needs {insufficient.needed.toLocaleString()} Ixis.</p>
              <a className="mt-2 inline-block underline" href={insufficient.buyUrl} target="_blank" rel="noreferrer">
                Buy Ixis in the Apixis Wallet, then come back and pay again.
              </a>
            </div>
          )}
          {paid && releaseId && (
            <div className="space-y-3">
              <p className="text-sm text-emerald-300">
                Paid{receiptId ? ` · receipt ${receiptId.slice(0, 12)}…` : ""}. Your release package is ready.
              </p>
              <a className="btn-primary inline-block" href={`/api/releases/${releaseId}/package`} download>
                Download release package (.zip)
              </a>
              <p className="text-xs text-ink-3">
                Contains lyrics.txt / .lrc / .srt, metadata.json, split-sheet.txt, and README.txt.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
