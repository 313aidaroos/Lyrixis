import Link from "next/link";
import { LiveDemo } from "@/components/LiveDemo";
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
  ["Cixy", "A native AI that knows mixing, mastering, metadata, and your catalog."],
];

const NOTES = [
  { left: "6%", delay: "0s", glyph: "♪" },
  { left: "18%", delay: "2.2s", glyph: "♫" },
  { left: "31%", delay: "4.4s", glyph: "♪" },
  { left: "68%", delay: "1.1s", glyph: "♬" },
  { left: "81%", delay: "3.3s", glyph: "♪" },
  { left: "92%", delay: "5.5s", glyph: "♫" },
];

export default async function HomePage() {
  const preview = (await searchCatalog("").catch(() => [])).slice(0, 5);

  return (
    <div>
      <SiteNav />

      <section className="relative overflow-hidden">
        <Wavefield />
        {NOTES.map((note, index) => (
          <span
            key={index}
            aria-hidden="true"
            className="note grad-text"
            style={{ left: note.left, bottom: "8%", animationDelay: note.delay }}
          >
            {note.glyph}
          </span>
        ))}
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 pb-20 pt-20 text-center lg:pt-28">
          <p className="rise font-mono text-xs uppercase tracking-[0.34em] text-ink-3">Music. Understood.</p>
          <img
            src="/lyrixis-logo.png"
            alt="Lyrixis logo"
            className="rise mt-6 h-40 w-40 object-contain drop-shadow-[0_18px_40px_rgba(99,102,241,0.28)] sm:h-52 sm:w-52 lg:h-60 lg:w-60"
          />
          <h1 className="wordmark mt-4">LYRIXIS</h1>
          <p className="rise-2 mt-8 max-w-3xl font-display text-2xl font-semibold text-ink sm:text-3xl">
            The intelligence layer for <span className="grad-text">music catalogs</span>
          </p>
          <p className="rise-2 mt-4 max-w-2xl text-lg text-ink-2">
            Search any song. Get lyrics, metadata, structure, and distribution-ready exports — one track
            or a million.
          </p>

          <form
            action="/catalog"
            method="get"
            className="rise-3 mt-10 flex w-full max-w-2xl flex-col gap-3 sm:flex-row"
          >
            <input
              className="input py-4 text-base shadow-lg shadow-violet/10"
              type="search"
              name="q"
              placeholder="Try “Amazing Grace”, an artist, or an ISRC…"
              aria-label="Search the catalog"
            />
            <button className="btn-primary btn-pulse sm:w-48" type="submit">
              Search the catalog
            </button>
          </form>
          <div className="rise-3 mt-5 flex flex-wrap items-center justify-center gap-4 text-sm">
            <a href="#demo" className="text-ink-2 hover:text-ink">
              ▶ Watch the demo
            </a>
            <span className="text-ink-3">·</span>
            <Link href="/waitlist" className="text-violet hover:underline">
              Join the waitlist →
            </Link>
            <span className="text-ink-3">·</span>
            <Link href="/cixy" className="text-ink-2 hover:text-ink">
              <span className="grad-text">◈</span> Ask Cixy anything about music
            </Link>
          </div>
          <p className="mt-8 text-sm text-ink-3">Built for artists, labels, distributors, DSPs — and anyone who sings along.</p>
        </div>
      </section>

      <section id="demo" className="mx-auto max-w-6xl px-6">
        <h2 className="text-center font-display text-3xl font-bold">See what Lyrixis does</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-ink-2">
          One recording in. Synced lyrics, structure, identifiers, and exports out.
        </p>
        <div className="mt-8">
          <LiveDemo />
        </div>
      </section>

      <section id="preview" className="mx-auto mt-16 max-w-6xl px-6">
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
                  <tr key={row.id} className="border-t border-line transition hover:bg-violet/5">
                    <td className="py-3">
                      <Link className="font-medium hover:text-violet" href={`/catalog/${row.publicId}`}>
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
          <Link href="/catalog" className="mt-6 inline-flex text-sm text-violet hover:underline">
            Open the full catalog →
          </Link>
        </div>
      </section>

      <section id="how" className="mx-auto mt-20 max-w-6xl px-6">
        <h2 className="text-center font-display text-3xl font-bold">How it works</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ["01", "Ingest", "Drop a track or a CSV. Confirm rights. We never scrape commercial lyrics."],
            ["02", "Understand", "Transcription, timing, language, and structure land as versioned records."],
            ["03", "Identify", "ISRC / ISWC / UPC attach to the recording — not a fuzzy title match."],
            ["04", "Deliver", "Search, view, export. One song or the whole catalog."],
          ].map(([n, title, copy]) => (
            <div key={n} className="card glass-lift">
              <p className="font-mono text-xs text-violet">{n}</p>
              <h3 className="mt-2 font-display text-xl">{title}</h3>
              <p className="mt-2 text-sm text-ink-2">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-6">
        <h2 className="text-center font-display text-3xl font-bold">What you get</h2>
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
          <div className="mt-8 flex flex-wrap justify-center gap-10 font-display text-5xl font-bold">
            <div>
              <p className="grad-text">1</p>
              <p className="mt-1 text-sm font-normal text-ink-3">track</p>
            </div>
            <div>
              <p className="grad-text">25</p>
              <p className="mt-1 text-sm font-normal text-ink-3">CSV rows / batch</p>
            </div>
            <div>
              <p className="grad-text">∞</p>
              <p className="mt-1 text-sm font-normal text-ink-3">catalog size</p>
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
