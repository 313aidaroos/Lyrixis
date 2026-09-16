"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import type { CatalogRecording } from "@/services/catalog";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function CatalogTable({
  rows,
  query,
}: {
  rows: CatalogRecording[];
  query: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [artist, setArtist] = useState("");
  const [hasIsrc, setHasIsrc] = useState(false);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (artist && !row.artist.toLowerCase().includes(artist.toLowerCase())) return false;
      if (hasIsrc && !row.isrc) return false;
      return true;
    });
  }, [rows, artist, hasIsrc]);

  if (rows.length === 0) {
    return (
      <div className="card mt-8 text-center">
        <p className="font-display text-xl">No recordings match that search.</p>
        <p className="mt-2 text-ink-2">Try a title, artist, ISRC, or ISWC — or join the waitlist for full access.</p>
        <Link href="/waitlist" className="btn-primary mt-6 inline-flex">
          Add to waitlist for full access
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder="Filter artist"
          value={artist}
          onChange={(event) => setArtist(event.target.value)}
          aria-label="Filter by artist"
        />
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" checked={hasIsrc} onChange={(event) => setHasIsrc(event.target.checked)} />
          Has ISRC
        </label>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-violet/5 text-ink-3">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Artist</th>
              <th className="px-4 py-3 font-medium">Year</th>
              <th className="px-4 py-3 font-medium">ISRC</th>
              <th className="px-4 py-3 font-medium">Length</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const open = openId === row.id;
              return (
                <Fragment key={row.id}>
                  <tr
                    className="cursor-pointer border-t border-line/80 hover:bg-violet/10"
                    onClick={() => setOpenId(open ? null : row.id)}
                  >
                    <td className="border-l-2 border-transparent px-4 py-3 hover:border-cyan">
                      <Link className="font-medium text-ink hover:text-cyan" href={`/catalog/${row.publicId}`}>
                        {row.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-2">{row.artist}</td>
                    <td className="px-4 py-3 text-ink-2">{row.year ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-2">{row.isrc ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-2">{formatDuration(row.durationSeconds)}</td>
                  </tr>
                  {open && (
                    <tr key={`${row.id}-preview`} className="border-t border-line/60 bg-violet/5">
                      <td colSpan={5} className="px-4 py-4">
                        <p className="text-xs uppercase tracking-widest text-ink-3">Intelligence preview</p>
                        <p className="mt-2 text-ink-2">
                          {row.title} · {row.artist}
                          {row.isrc ? ` · ISRC ${row.isrc}` : ""} · {row.source}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link href={`/catalog/${row.publicId}`} className="btn-secondary px-4 py-2 text-sm">
                            Open recording
                          </Link>
                          <Link href="/waitlist" className="btn-primary px-4 py-2 text-sm">
                            Full access waitlist
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <p className="mt-4 text-sm text-ink-3">Filters hid every row{query ? ` for “${query}”` : ""}.</p>
      )}
    </div>
  );
}
