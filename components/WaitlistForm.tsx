"use client";

import { useState, type FormEvent } from "react";

export function WaitlistForm({ compact = false }: { compact?: boolean }) {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(form.get("name") ?? ""),
          work_email: String(form.get("email") ?? ""),
          company: String(form.get("company") ?? ""),
          integration: String(form.get("role") ?? ""),
          use_case: String(form.get("use_case") ?? ""),
        }),
      });
      const json = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(json.error?.message ?? "Could not join the waitlist.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join the waitlist.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="card text-center">
        <p className="font-display text-2xl font-semibold">You’re on the list.</p>
        <p className="mt-2 text-ink-2">We’ll be in touch soon.</p>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="grid gap-4">
      <label className="block">
        <span className="label">Full name</span>
        <input className="input" name="name" required maxLength={200} />
      </label>
      <label className="block">
        <span className="label">Work email</span>
        <input className="input" name="email" type="email" required maxLength={320} />
      </label>
      {!compact && (
        <>
          <label className="block">
            <span className="label">Company / artist name</span>
            <input className="input" name="company" maxLength={200} />
          </label>
          <label className="block">
            <span className="label">Role</span>
            <select className="input" name="role" defaultValue="Artist">
              <option>Artist</option>
              <option>Label</option>
              <option>Distributor</option>
              <option>DSP</option>
              <option>Other</option>
            </select>
          </label>
          <label className="block">
            <span className="label">What do you want Lyrixis to solve?</span>
            <textarea className="input min-h-28" name="use_case" maxLength={300} />
          </label>
        </>
      )}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <button className="btn-primary btn-pulse" type="submit" disabled={pending}>
        {pending ? "Joining…" : "Join the waitlist"}
      </button>
    </form>
  );
}
