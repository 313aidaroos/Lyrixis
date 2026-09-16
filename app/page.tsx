import Link from "next/link";
import { CatalogNav } from "@/components/CatalogNav";
import { searchCatalog } from "@/services/catalog";

export const dynamic = "force-dynamic";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const whole = Math.round(seconds);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function CatalogHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  let results: Awaited<ReturnType<typeof searchCatalog>> = [];
  let errorMessage: string | null = null;
  try {
    results = await searchCatalog(q);
  } catch {
    errorMessage = "Catalog is temporarily unavailable.";
  }

  return (
    <div>
      <CatalogNav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Catalog</p>
        <h1 className="mt-2 font-display text-4xl font-bold">
          Search lyrics and <span className="grad-text">metadata</span>
        </h1>
        <p className="mt-3 max-w-2xl text-ink-2">
          Title, artist, ISRC, ISWC, or UPC. Records live in Supabase. Public-domain seed works
          ship first; commercial lyrics stay licensed.
        </p>

        <form action="/" method="get" className="mt-8 flex flex-col gap-3 sm:flex-row">
          <input
            className="input"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Title, artist, writer, year, ISRC, ISWC…"
            aria-label="Search catalog"
          />
          <button className="btn-primary sm:w-40" type="submit">
            Search
          </button>
        </form>

        {!errorMessage && (
          <p className="mt-4 text-sm text-ink-3">
            {q
              ? `${results.length} match${results.length === 1 ? "" : "es"} for “${q}”`
              : `${results.length} recording${results.length === 1 ? "" : "s"} in the catalog`}
          </p>
        )}

        {errorMessage ? (
          <div className="card mt-10">
            <p className="text-ink-2">{errorMessage}</p>
          </div>
        ) : results.length === 0 ? (
          <div className="card mt-10">
            <p className="text-ink-2">
              {q ? `No recordings match “${q}”.` : "No recordings in the catalog yet."}
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface text-ink-3">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Artist</th>
                  <th className="px-4 py-3 font-medium">Year</th>
                  <th className="px-4 py-3 font-medium">ISRC</th>
                  <th className="px-4 py-3 font-medium">ISWC</th>
                  <th className="px-4 py-3 font-medium">Length</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row) => (
                  <tr key={row.id} className="border-t border-line/80">
                    <td className="px-4 py-3">
                      <Link className="text-ink hover:text-violet" href={`/catalog/${row.publicId}`}>
                        {row.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-2">{row.artist}</td>
                    <td className="px-4 py-3 text-ink-2">{row.year ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-2">{row.isrc ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-2">{row.iswc ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-2">{formatDuration(row.durationSeconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
