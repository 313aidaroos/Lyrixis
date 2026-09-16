export function VisionPanel() {
  return (
    <div className="grid gap-6">
      <section className="page-panel">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-gold">Our vision</p>
        <h2 className="mt-2 font-display text-3xl font-bold">Music. Understood.</h2>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-2">
          Every recording should be findable by the IDs that actually matter — ISRC, ISWC, UPC —
          with lyrics only when we have a license to show them. Lyrixis is a living catalog, not a
          lyric dump and not a brochure.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="card">
          <h3 className="font-display text-xl font-semibold">What the site does</h3>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-ink-2">
            <li>Search recordings by title, artist, writer, year, ISRC, ISWC, or UPC.</li>
            <li>Open a recording to see metadata and lyrics when they are public-domain or original.</li>
            <li>Add one song or bulk-ingest a CSV — commercial copyrighted lyrics are rejected.</li>
            <li>Keep identifiers normalized so the same ISRC does not land twice.</li>
          </ul>
        </div>
        <div className="card">
          <h3 className="font-display text-xl font-semibold">Who uses it</h3>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-ink-2">
            <li>Labels and distributors matching messy tags to canonical recordings.</li>
            <li>Publishers and writers checking works (ISWC) against recordings (ISRC).</li>
            <li>Karaoke and sync teams who need licensed, timed lyrics — not scraped pages.</li>
            <li>Artists adding original work, and catalog ops ingesting public-domain songs.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
