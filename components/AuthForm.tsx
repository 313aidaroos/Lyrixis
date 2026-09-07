"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);
    const supabase = createBrowserSupabaseClient();
    try {
      if (mode === "login") {
        const { error: signError } = await supabase.auth.signInWithPassword({ email, password });
        if (signError) throw signError;
        router.push(next);
        router.refresh();
        return;
      }
      const origin = window.location.origin;
      const { error: signError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (signError) throw signError;
      setNotice("Check your email to confirm your account, then sign in. If confirmation is disabled, you can sign in now.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setPending(false);
    }
  }

  async function google() {
    setError(null);
    const supabase = createBrowserSupabaseClient();
    const origin = window.location.origin;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (oauthError) setError(oauthError.message);
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="page-panel">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Lyrixis</p>
        <h1 className="mt-3 font-display text-3xl font-bold">
          {mode === "login" ? "Sign in" : "Create an account"}
        </h1>
        <p className="mt-2 text-sm text-ink-2">
          Email and password, or Google. Processing starts after you upload a track you have rights to.
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
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {error && <p className="text-sm text-rose-300">{error}</p>}
          {notice && <p className="text-sm text-cyan-300">{notice}</p>}
          <button className="btn-primary w-full" type="submit" disabled={pending}>
            {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Sign up"}
          </button>
        </form>

        <button className="btn-secondary mt-4 w-full" type="button" onClick={() => void google()}>
          Continue with Google
        </button>

        <p className="mt-6 text-sm text-ink-3">
          {mode === "login" ? (
            <>
              No account?{" "}
              <Link className="text-violet" href="/signup">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link className="text-violet" href="/login">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
