"use client";

import { useState } from "react";
import { SALES_EMAIL } from "@/lib/ixis-pricing";

type Done = { email: string; emailed: boolean };

export function EnterpriseInquiryForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/enterprise/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.get("companyName"),
          contactName: form.get("contactName"),
          workEmail: form.get("workEmail"),
          phone: form.get("phone"),
          songsPerMonth: form.get("songsPerMonth"),
          teamSeats: form.get("teamSeats"),
          message: form.get("message"),
        }),
      });
      const json = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
        emailed?: boolean;
      };
      if (!response.ok) throw new Error(json.error?.message ?? "Could not send your request.");
      setDone({ email: String(form.get("workEmail") ?? ""), emailed: Boolean(json.emailed) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your request.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="glass rounded-3xl p-8 sm:p-10 text-center" role="status">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan">Contact sales</p>
        <h2 className="mt-3 font-display text-3xl font-bold sm:font-marquee sm:text-4xl">We received your request.</h2>
        <p className="mx-auto mt-4 max-w-xl text-ink-2">
          Thank you. Your company details are saved
          {done.emailed ? ` and emailed to ${SALES_EMAIL}` : ""}. Awad reviews Label / Enterprise requests and will reply
          at {done.email || "your work email"}.
        </p>
        <p className="mx-auto mt-3 max-w-xl text-sm text-ink-3">
          When the company is approved, sign in with that work email and open Team. The owner invites everyone else.
          {!done.emailed ? ` If you do not hear back, email ${SALES_EMAIL}.` : ""}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="glass rounded-3xl p-6 sm:p-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan">Contact sales</p>
      <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">Label / Enterprise</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">
        No fixed price. This form saves your request and emails {SALES_EMAIL}.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="label">Company name</span>
          <input name="companyName" required className="input mt-1" autoComplete="organization" />
        </label>
        <label className="block text-sm">
          <span className="label">Your name</span>
          <input name="contactName" required className="input mt-1" autoComplete="name" />
        </label>
        <label className="block text-sm">
          <span className="label">Work email</span>
          <input name="workEmail" type="email" required className="input mt-1" autoComplete="email" />
        </label>
        <label className="block text-sm">
          <span className="label">Phone (optional)</span>
          <input name="phone" type="tel" className="input mt-1" autoComplete="tel" />
        </label>
        <label className="block text-sm">
          <span className="label">About how many songs per month</span>
          <input name="songsPerMonth" required className="input mt-1" placeholder="About 200" />
        </label>
        <label className="block text-sm">
          <span className="label">Team seats</span>
          <input name="teamSeats" type="number" min={1} max={10000} required className="input mt-1" defaultValue={5} />
        </label>
      </div>
      <label className="mt-4 block text-sm">
        <span className="label">Message</span>
        <textarea name="message" required minLength={8} rows={4} className="input mt-1" placeholder="What you want Lyrixis to do for the catalog." />
      </label>
      {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
      <button type="submit" className="btn-primary mt-6 px-5 py-2.5 text-sm" disabled={pending}>
        {pending ? "Sending…" : "Contact sales"}
      </button>
    </form>
  );
}
