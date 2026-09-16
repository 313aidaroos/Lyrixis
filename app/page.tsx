import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { WaitlistForm } from "@/components/WaitlistForm";
import { Wavefield } from "@/components/Wavefield";
import { searchCatalog } from "@/services/catalog";

export const dynamic = "force-dynamic";

const FEATURES = [
  ["Synced lyrics", "Line-level timings ready for karaoke, captions, and DSP delivery."],
  ["Structure", "Verse, chorus, bridge — mapped, not guessed from a blob of text."],
  ["Metadata", "ISRC, ISWC, UPC, writers, and language stored as first-class fields."],
  ["Exports", "TXT, SRT, LRC, JSON — distribution-ready, not a screenshot."],
  ["Bulk ingest", "CSV or API-shaped batches. Public-domain or original lyrics only."],
  ["License path", "Commercial lyrics stay licensed. The catalog does not scrape the web."],
  ["Search", "Title, artist, writer, year, and the IDs that actually match recordings."],
  ["Scale", "One track tonight. A million when the pipeline is on."],
];

export default async function HomePage() {
  const preview = (await searchCatalog("").catch(() => [])).slice(0, 5);

  return (
    <div>
      <SiteNav />
      <section className="relative overflow-hidden">
        <Wavefield />
        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-16 lg:pt-24">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan">Lyrixis</p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            The intelligence layer for <span className="grad-text">music catalogs</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-2">
            Upload one track or a million. Get lyrics, sync, structure, metadata, translations, and
            distribution-ready exports in minutes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/waitlist" className="btn-primary btn-pulse">
              Join the waitlist
            </Link>
            <a href="#preview" className="btn-secondary">
              Watch demo
            </a>
          </div>
          <p className="mt-5 text-sm text-ink-3">Built for artists, labels, distributors & DSPs</p>
        </div>
      </section>

      <section id="preview" className="mx-auto max-w-6xl px-6">
        <div className="card">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-3">Live catalog preview</p>
          <h2 className="mt-2 font-display text-2xl font-semibold">Public seed recordings</h2>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-ink-3">
                <tr>
                  <th className="py-2 font-medium">Title</th>
                  <th className="py-2 font-medium">Artist</th>
                  <th className="py-2 font-medium">Year</th>
                  <th className="py-2 font-medium">ISRC</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr key={row.id} className="border-t border-line/80">
                    <td className="py-3">
                      <Link className="hover:text-cyan" href={`/catalog/${row.publicId}`}>
                        {row.title}
                      </Link>
                    </td>
                    <td className="py-3 text-ink-2">{row.artist}</td>
                    <td className="py-3 text-ink-2">{row.year ?? "—"}</td>
                    <td className="py-3 font-mono text-xs text-ink-2">{row.isrc ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href="/catalog" className="mt-6 inline-flex text-sm text-cyan hover:underline">
            Open the full catalog →
          </Link>
        </div>
      </section>

      <section id="how" className="mx-auto mt-20 max-w-6xl px-6">
        <h2 className="font-display text-3xl font-bold">How it works</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ["01", "Ingest", "Drop a track or a CSV. Confirm rights. We never scrape commercial lyrics."],
            ["02", "Understand", "Transcription, timing, language, and structure land as versioned records."],
            ["03", "Identify", "ISRC / ISWC / UPC attach to the recording — not a fuzzy title match."],
            ["04", "Deliver", "Search, view, export. One song or the whole catalog."],
          ].map(([n, title, copy]) => (
            <div key={n} className="card glass-lift">
              <p className="font-mono text-xs text-cyan">{n}</p>
              <h3 className="mt-2 font-display text-xl">{title}</h3>
              <p className="mt-2 text-sm text-ink-2">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-6">
        <h2 className="font-display text-3xl font-bold">What you get</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(([title, copy]) => (
            <div key={title} className="card glass-lift">
              <h3 className="font-display text-lg">{title}</h3>
              <p className="mt-2 text-sm text-ink-2">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-6">
        <div className="page-panel text-center">
          <h2 className="font-display text-4xl font-bold">One song. Or your entire catalog.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-ink-2">
            Start with a single recording. When you are ready, bulk ingest and API access scale with you.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-10 font-display text-4xl">
            <div>
              <p className="grad-text">1</p>
              <p className="mt-1 text-sm text-ink-3">track</p>
            </div>
            <div>
              <p className="grad-text">25</p>
              <p className="mt-1 text-sm text-ink-3">CSV rows / batch</p>
            </div>
            <div>
              <p className="grad-text">∞</p>
              <p className="mt-1 text-sm text-ink-3">catalog size</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-xl px-6 pb-8">
        <h2 className="text-center font-display text-3xl font-bold">Get early access</h2>
        <p className="mt-2 text-center text-ink-2">Join the waitlist. We onboard catalogs, not scrapers.</p>
        <div className="mt-8">
          <WaitlistForm compact />
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
