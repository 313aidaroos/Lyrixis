import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { SyncedLyrics } from "@/components/SyncedLyrics";
import { getTrackByPublicId } from "@/services/tracks";
import { TrackStatusPoller } from "./TrackStatusPoller";

export const dynamic = "force-dynamic";

const EXPORT_FORMATS = ["json", "srt", "lrc", "txt", "mead"];

export default async function TrackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const track = getTrackByPublicId(id);
  if (!track) notFound();

  const isProcessing = !["completed", "failed", "manual_review"].includes(
    track.status
  );
  const isDone = track.status === "completed" || track.status === "manual_review";

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {isProcessing && <TrackStatusPoller publicId={id} />}

      <div className="page-panel mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-ink-2">{track.publicId}</p>
          <h1 className="text-hero mt-2 font-display text-4xl font-bold">{track.title}</h1>
          <p className="text-hero mt-1 text-xl text-ink">{track.artist}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isDone && <ConfidenceBadge band={track.confidenceBand} />}
          <span className="rounded-full bg-[#110e1c]/90 px-3 py-1 text-sm capitalize text-ink">
            {track.accountType}
          </span>
        </div>
      </div>

      {isProcessing && (
        <div className="card mt-8 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet border-t-transparent" />
          <p className="mt-4 text-lg font-medium">Processing your track…</p>
          <p className="mt-2 text-ink-3">
            Status: {track.status.replace(/_/g, " ")}
          </p>
          {track.notifyEmail && (
            <p className="mt-2 text-sm text-ink-3">
              We&apos;ll email {track.notifyEmail} when ready.
            </p>
          )}
        </div>
      )}

      {track.status === "failed" && (
        <div className="mt-8 rounded-xl border border-rose-500/50 bg-rose-500/10 p-6">
          <p className="font-medium text-rose-300">Processing failed</p>
          <Link href="/upload" className="btn-secondary mt-4">
            Try again
          </Link>
        </div>
      )}

      {isDone && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-4">
            {[
              { label: "Duration", value: formatDuration(track.durationSeconds) },
              { label: "Language", value: track.language || "—" },
              { label: "Explicit", value: track.explicit },
              { label: "Lines", value: String(track.lyrics.length) },
            ].map((s) => (
              <div key={s.label} className="card !p-4 text-center">
                <p className="text-xs uppercase tracking-wide text-ink-3">{s.label}</p>
                <p className="mt-1 font-semibold capitalize">{s.value}</p>
              </div>
            ))}
          </div>

          <section className="mt-10">
            <h2 className="font-display text-2xl font-bold">Synced lyrics</h2>
            <div className="mt-4">
              <SyncedLyrics
                lines={track.lyrics}
                audioUrl={`/api/v1/tracks/${id}/audio`}
              />
            </div>
          </section>

          {track.structure.length > 0 && (
            <section className="mt-10">
              <h2 className="font-display text-2xl font-bold">Structure</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {track.structure.map((s, i) => (
                  <div key={i} className="card !px-4 !py-3">
                    <span className="font-medium capitalize">{s.label}</span>
                    <span className="ml-2 font-mono text-xs text-ink-3">
                      {formatMs(s.startMs)} – {formatMs(s.endMs)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {track.metadata && Object.keys(track.metadata).length > 1 && (
            <section className="mt-10">
              <h2 className="font-display text-2xl font-bold">Metadata</h2>
              <div className="card mt-4 font-mono text-sm">
                <pre className="overflow-x-auto text-ink-2">
                  {JSON.stringify(track.metadata, null, 2)}
                </pre>
              </div>
            </section>
          )}

          <section className="mt-10">
            <h2 className="font-display text-2xl font-bold">Download exports</h2>
            <p className="mt-2 text-ink-2">
              Get your intelligence package back in the format you need.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {EXPORT_FORMATS.map((fmt) => (
                <a
                  key={fmt}
                  href={`/api/v1/tracks/${id}/exports?format=${fmt}`}
                  className="btn-secondary !px-4 !py-2 text-sm uppercase"
                  download
                >
                  {fmt}
                </a>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatMs(ms: number) {
  return formatDuration(ms / 1000);
}
