"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function AddRecordingForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      title: String(form.get("title") ?? ""),
      artist: String(form.get("artist") ?? ""),
      album: String(form.get("album") ?? ""),
      year: String(form.get("year") ?? ""),
      isrc: String(form.get("isrc") ?? ""),
      iswc: String(form.get("iswc") ?? ""),
      upc: String(form.get("upc") ?? ""),
      writers: String(form.get("writers") ?? ""),
      license: String(form.get("license") ?? ""),
      license_note: String(form.get("license_note") ?? ""),
      lyrics: String(form.get("lyrics") ?? ""),
    };

    try {
      const response = await fetch("/api/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as {
        recording?: { publicId?: string };
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(json.error?.message ?? "Could not add that recording.");
      }
      const id = json.recording?.publicId;
      if (!id) throw new Error("Saved, but no catalog id came back.");
      router.push(`/catalog/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that recording.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="mt-8 grid gap-5">
      <label className="block">
        <span className="label">Title</span>
        <input className="input" name="title" required maxLength={200} />
      </label>
      <label className="block">
        <span className="label">Artist / performer</span>
        <input className="input" name="artist" required maxLength={200} />
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="label">Album</span>
          <input className="input" name="album" maxLength={200} />
        </label>
        <label className="block">
          <span className="label">Year</span>
          <input className="input" name="year" inputMode="numeric" maxLength={4} />
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <label className="block">
          <span className="label">ISRC</span>
          <input className="input font-mono text-sm" name="isrc" maxLength={20} placeholder="CC-XXX-YY-NNNNN" />
        </label>
        <label className="block">
          <span className="label">ISWC</span>
          <input className="input font-mono text-sm" name="iswc" maxLength={20} placeholder="T-000.000.001-0" />
        </label>
        <label className="block">
          <span className="label">UPC</span>
          <input className="input font-mono text-sm" name="upc" maxLength={14} />
        </label>
      </div>
      <label className="block">
        <span className="label">Writers (comma-separated)</span>
        <input className="input" name="writers" maxLength={400} />
      </label>
      <label className="block">
        <span className="label">Lyrics license</span>
        <select className="input" name="license" required defaultValue="original">
          <option value="original">Original work I wrote</option>
          <option value="public_domain">Public domain</option>
        </select>
      </label>
      <label className="block">
        <span className="label">License note</span>
        <input className="input" name="license_note" maxLength={400} placeholder="e.g. Traditional hymn, 1779" />
      </label>
      <label className="block">
        <span className="label">Lyrics</span>
        <textarea className="input min-h-48 font-body" name="lyrics" required minLength={8} maxLength={20000} />
      </label>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <button className="btn-primary w-full sm:w-56" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Add to catalog"}
      </button>
    </form>
  );
}
