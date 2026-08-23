"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AccountType } from "@/types";

const ACCOUNT_TYPES: { value: AccountType; label: string; desc: string }[] = [
  { value: "individual", label: "Individual / Artist", desc: "Single track upload" },
  { value: "company", label: "Company", desc: "Business account" },
  { value: "label", label: "Record Label", desc: "Catalog enrichment" },
  { value: "distributor", label: "Distributor", desc: "Bulk metadata QA" },
  { value: "ddex", label: "DDEX Feed", desc: "ERN XML + audio pairing" },
];

export default function UploadPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [email, setEmail] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [ddexFile, setDdexFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!audioFile) {
      setError("Please select an audio file.");
      return;
    }
    if (!rightsConfirmed) {
      setError("You must confirm you have rights to process this recording.");
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append("audio", audioFile);
      form.append("account_type", accountType);
      form.append("rights_confirmed", "true");
      if (title) form.append("title", title);
      if (artist) form.append("artist", artist);
      if (email) form.append("notify_email", email);
      if (ddexFile) form.append("ddex_xml", ddexFile);

      const res = await fetch("/api/v1/tracks", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      router.push(`/tracks/${data.public_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="page-panel">
      <h1 className="text-hero font-display text-4xl font-bold">Process a song</h1>
      <p className="text-hero mt-3 text-ink">
        Upload audio. Lyrixis analyzes it and sends back synced lyrics, structure,
        metadata, and exports.
      </p>

      <form onSubmit={handleSubmit} className="mt-10 space-y-8">
        <div>
          <label className="label">Account type</label>
          <div className="grid gap-3 sm:grid-cols-2">
            {ACCOUNT_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setAccountType(t.value)}
                className={`rounded-xl border p-4 text-left transition ${
                  accountType === t.value
                    ? "border-violet bg-violet/10"
                    : "border-line bg-surface hover:border-ink-3"
                }`}
              >
                <div className="font-semibold">{t.label}</div>
                <div className="mt-1 text-sm text-ink-3">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="title">
              Title (optional)
            </label>
            <input
              id="title"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Song title"
            />
          </div>
          <div>
            <label className="label" htmlFor="artist">
              Artist (optional)
            </label>
            <input
              id="artist"
              className="input"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Artist name"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="email">
            Email for results (optional)
          </label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@label.com"
          />
          <p className="mt-2 text-sm text-ink-3">
            We&apos;ll email you a link when processing completes.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="audio">
            Audio file *
          </label>
          <input
            id="audio"
            type="file"
            accept=".mp3,.wav,.flac,.m4a,audio/*"
            className="input file:mr-4 file:rounded-lg file:border-0 file:bg-violet/20 file:px-4 file:py-2 file:text-violet"
            onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
            required
          />
          <p className="mt-2 text-sm text-ink-2">
            MP3, WAV, FLAC, or M4A — up to 100MB
          </p>
        </div>

        {accountType === "ddex" && (
          <div>
            <label className="label" htmlFor="ddex">
              DDEX ERN XML (optional)
            </label>
            <input
              id="ddex"
              type="file"
              accept=".xml,text/xml,application/xml"
              className="input file:mr-4 file:rounded-lg file:border-0 file:bg-cyan/20 file:px-4 file:py-2 file:text-cyan"
              onChange={(e) => setDdexFile(e.target.files?.[0] || null)}
            />
            <p className="mt-2 text-sm text-ink-3">
              Pair your ERN feed metadata with the audio for enriched exports.
            </p>
          </div>
        )}

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-4">
          <input
            type="checkbox"
            checked={rightsConfirmed}
            onChange={(e) => setRightsConfirmed(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm text-ink-2">
            I confirm I have the legal right to upload and process this recording,
            including for transcription and metadata enrichment.
          </span>
        </label>

        {error && (
          <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 p-4 text-sm text-rose-300">
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Uploading…" : "Upload & process"}
        </button>
      </form>
      </div>
    </div>
  );
}
