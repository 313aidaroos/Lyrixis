"use client";

import { useState, type FormEvent } from "react";
import { BULK_CSV_HEADER } from "@/lib/catalog-csv";

const SAMPLE = `${BULK_CSV_HEADER}
Night Catalog One,Lyrixis Ensemble,,2026,QZ-LXA-26-00001,T-034.524.680-1,,Lyrixis,original,Original catalog probe,A short original line for the night catalog.
Night Catalog Two,Lyrixis Ensemble,,2026,QZ-LXA-26-00002,T-034.524.680-2,,Lyrixis,original,Original catalog probe,Another original line. No commercial lyrics.
`;

export function BulkIngestForm() {
  const [csv, setCsv] = useState(SAMPLE);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSummary(null);
    setPending(true);
    try {
      const response = await fetch("/api/catalog/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const json = (await response.json()) as {
        created?: { publicId: string; title: string; isrc: string | null }[];
        errors?: { title: string | null; message: string }[];
        error?: { message?: string };
      };
      if (!response.ok && !json.created) {
        throw new Error(json.error?.message ?? "Bulk ingest failed.");
      }
      const created = json.created ?? [];
      const errors = json.errors ?? [];
      setSummary(
        `Saved ${created.length}. ${errors.length ? `${errors.length} row(s) failed.` : "All rows saved."}`
      );
      if (errors.length > 0) {
        setError(errors.map((row) => `${row.title ?? "row"}: ${row.message}`).join(" "));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk ingest failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="mt-6 grid gap-4">
      <label className="block">
        <span className="label">CSV</span>
        <textarea
          className="input min-h-56 font-mono text-xs"
          value={csv}
          onChange={(event) => setCsv(event.target.value)}
          required
        />
      </label>
      <p className="text-xs text-ink-3">
        License must be public_domain or original on every row. Commercial copyrighted lyrics are
        rejected. Max 25 rows. ISRC/ISWC/UPC are stored normalized.
      </p>
      {summary && <p className="text-sm text-cyan">{summary}</p>}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <button className="btn-secondary w-full sm:w-56" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Bulk add"}
      </button>
    </form>
  );
}
