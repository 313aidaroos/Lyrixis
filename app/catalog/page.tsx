import { CatalogTable } from "@/components/CatalogTable";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { searchCatalog } from "@/services/catalog";

export const dynamic = "force-dynamic";

export default async function CatalogPage({
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
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-2 text-sm text-cyan">
          Public seed catalog — {results.length} recording{results.length === 1 ? "" : "s"} shown
          {q ? ` for “${q}”` : ""}. Commercial tracks stay licensed.
        </p>
        <h1 className="mt-6 font-display text-4xl font-bold">
          Catalog <span className="grad-text">intelligence</span>
        </h1>
        <form action="/catalog" method="get" className="mt-6 flex flex-col gap-3 sm:flex-row">
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
        {errorMessage ? (
          <div className="card mt-8">
            <p className="text-ink-2">{errorMessage}</p>
          </div>
        ) : (
          <CatalogTable rows={results} query={q} />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
