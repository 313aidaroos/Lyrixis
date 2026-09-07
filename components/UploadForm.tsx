"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UploadForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rights, setRights] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!rights) {
      setError("You must confirm you have the rights to process this recording.");
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("rights_confirmed", "true");
    setPending(true);
    try {
      const response = await fetch("/api/tracks", { method: "POST", body: data });
      const json = (await response.json()) as {
        track_id?: string;
        error?: { message: string };
      };
      if (!response.ok) {
        throw new Error(json.error?.message ?? "Upload failed.");
      }
      if (!json.track_id) {
        throw new Error("Server did not return a track id.");
      }
      router.push(`/tracks/${json.track_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="page-panel space-y-6" onSubmit={(event) => void onSubmit(event)}>
      <div>
        <label className="label" htmlFor="audio">
          Audio file
        </label>
        <input
          id="audio"
          name="audio"
          className="input"
          type="file"
          accept="audio/mpeg,audio/wav,audio/flac,audio/mp4,audio/x-m4a,audio/ogg,.mp3,.wav,.flac,.m4a,.ogg"
          required
        />
        <p className="mt-2 text-xs text-ink-3">MP3, WAV, FLAC, M4A, or OGG. Max 100 MB, 15 minutes.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="title">
            Title
          </label>
          <input id="title" name="title" className="input" placeholder="Optional — read from tags if empty" />
        </div>
        <div>
          <label className="label" htmlFor="artist">
            Artist
          </label>
          <input id="artist" name="artist" className="input" placeholder="Optional" />
        </div>
      </div>
      <label className="flex items-start gap-3 text-sm text-ink-2">
        <input
          type="checkbox"
          className="mt-1"
          checked={rights}
          onChange={(event) => setRights(event.target.checked)}
          required
        />
        <span>
          I confirm I have the rights to upload this recording and to generate lyrics from it. Lyrixis stores this
          confirmation and timestamp as a legal record.
        </span>
      </label>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      <button className="btn-primary" type="submit" disabled={pending || !rights}>
        {pending ? "Uploading…" : "Upload and process"}
      </button>
    </form>
  );
}
