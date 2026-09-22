"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/catalog";
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || 'Failed to send magic link');
        return;
      }

      setSent(true);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-md px-6 py-16">
        <div className="page-panel">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Lyrixis</p>
          <h1 className="mt-3 font-display text-3xl font-bold">Check your email</h1>
          <p className="mt-2 text-sm text-ink-2">
            As-salamu alaykum. We sent a sign-in link to <strong>{email}</strong>.
          </p>
          <p className="mt-4 text-sm text-ink-3">
            The link expires in 24 hours. If you don&apos;t see it, check spam.
          </p>
          <button
            className="btn-secondary mt-6 w-full"
            onClick={() => {
              setSent(false);
              setEmail("");
            }}
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="page-panel">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Lyrixis</p>
        <h1 className="mt-3 font-display text-3xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm text-ink-2">
          Enter your email. We&apos;ll send you a magic link to sign in — no password needed.
        </p>

        <form className="mt-8 space-y-4" onSubmit={(event) => void onSubmit(event)}>
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>
          {error && (
            <div className="card bg-red-500/10 border-red-500/30">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
          <button className="btn-primary w-full" type="submit" disabled={pending}>
            {pending ? "Sending..." : "Send magic link"}
          </button>
        </form>

        <p className="mt-6 text-xs text-ink-3 text-center">
          100 Ixis = $1. Paid Ixis never expires.
        </p>
      </div>
    </div>
  );
}
