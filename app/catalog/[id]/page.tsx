import { notFound } from "next/navigation";
import { formatIsrc, formatIswc } from "@/lib/music-ids";
import { SiteNav } from "@/components/SiteNav";
import { getCatalogRecording } from "@/services/catalog";

export const dynamic = "force-dynamic";

function Meta({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-widest text-ink-3">{label}</p>
      <p className="mt-1 text-sm text-ink">{value && value.length > 0 ? value : "—"}</p>
    </div>
  );
}

export default async function CatalogRecordingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recording = await getCatalogRecording(id);
  if (!recording) notFound();

  const writers = recording.writers.length > 0 ? recording.writers.join(", ") : null;

  return (
    <div>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Recording</p>
        <h1 className="mt-2 font-display text-4xl font-bold">{recording.title}</h1>
        <p className="mt-2 text-lg text-ink-2">{recording.artist}</p>

        <div className="card mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3">
          <Meta label="Album" value={recording.album} />
          <Meta label="Year" value={recording.year ? String(recording.year) : null} />
          <Meta label="Language" value={recording.language} />
          <Meta label="ISRC" value={formatIsrc(recording.isrc) ?? recording.isrc} />
          <Meta label="ISWC" value={formatIswc(recording.iswc) ?? recording.iswc} />
          <Meta label="UPC" value={recording.upc} />
          <Meta label="Label" value={recording.label} />
          <Meta label="Writers" value={writers} />
          <Meta label="Source" value={recording.source} />
        </div>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">Lyrics</h2>
          {recording.lyrics ? (
            <>
              <p className="mt-2 text-xs text-ink-3">
                License: {recording.lyrics.license}
                {recording.lyrics.licenseNote ? ` — ${recording.lyrics.licenseNote}` : ""}
              </p>
              <pre className="card mt-4 whitespace-pre-wrap font-body text-base leading-relaxed text-ink">
                {recording.lyrics.fullText}
              </pre>
            </>
          ) : (
            <p className="mt-3 text-ink-2">No lyrics on file for this recording.</p>
          )}
        </section>
      </main>
    </div>
  );
}
