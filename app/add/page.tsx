import { AddRecordingForm } from "@/components/AddRecordingForm";
import { BulkIngestForm } from "@/components/BulkIngestForm";
import { CatalogNav } from "@/components/CatalogNav";

export default function AddRecordingPage() {
  return (
    <div>
      <CatalogNav />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Ingest</p>
        <h1 className="mt-2 font-display text-4xl font-bold">Add a recording</h1>
        <p className="mt-3 text-ink-2">
          Saves metadata and lyrics to Supabase. Public-domain or original lyrics only — no
          commercial copyrighted text. ISRC, ISWC, and UPC persist and are searchable.
        </p>
        <AddRecordingForm />

        <hr className="my-12 border-line" />
        <h2 className="font-display text-2xl font-semibold">Bulk ingest</h2>
        <p className="mt-2 text-ink-2">
          CSV header: title, artist, album, year, isrc, iswc, upc, writers, license, license_note,
          lyrics. Metadata-only rows need an ISRC, ISWC, or UPC.
        </p>
        <BulkIngestForm />
      </main>
    </div>
  );
}
