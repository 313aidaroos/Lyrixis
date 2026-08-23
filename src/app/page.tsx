import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <section className="page-panel py-12 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">
          Music intelligence platform
        </p>
        <h1 className="text-hero mt-4 font-display text-5xl font-bold leading-tight md:text-6xl">
          Upload a song.
          <br />
          <span className="grad-text">Get intelligence back.</span>
        </h1>
        <p className="text-hero mx-auto mt-6 max-w-2xl text-lg text-ink">
          Artists, labels, distributors, and DDEX catalogs — drop in audio or an ERN
          feed and Lyrixis returns synchronized lyrics, structure, metadata, and
          export-ready files.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link href="/upload" className="btn-primary">
            Process a song
          </Link>
          <Link href="/dashboard" className="btn-secondary">
            View dashboard
          </Link>
        </div>
      </section>

      <section className="grid gap-6 py-16 md:grid-cols-3">
        {[
          {
            title: "Individuals & artists",
            desc: "Upload one track, get synced lyrics and exports in minutes.",
          },
          {
            title: "Labels & distributors",
            desc: "Batch-ready pipeline with confidence bands and QA flags.",
          },
          {
            title: "DDEX catalogs",
            desc: "Ingest ERN metadata, enrich with audio analysis, export MEAD-compatible packages.",
          },
        ].map((item) => (
          <div key={item.title} className="card">
            <h3 className="font-display text-xl font-semibold">{item.title}</h3>
            <p className="mt-3 text-ink-2">{item.desc}</p>
          </div>
        ))}
      </section>

      <section className="card py-8 text-center">
        <h2 className="font-display text-2xl font-bold">What you get back</h2>
        <p className="mx-auto mt-4 max-w-xl text-ink-2">
          Transcription · word-level sync · song structure · language ID · explicit
          screening · JSON · SRT · LRC · TXT · MEAD
        </p>
        <p className="mt-4 text-sm text-ink-3">
          Results delivered on-page and emailed when you provide an address.
        </p>
      </section>
    </div>
  );
}
