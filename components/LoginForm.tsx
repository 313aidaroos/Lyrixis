"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { magicLink, login } from "@/app/login/actions";

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [notice, setNotice] = useState("");

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="page-panel">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Lyrixis</p>
        <h1 className="mt-3 font-display text-3xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm text-ink-2">
          {mode === "magic" 
            ? "We'll email you a sign-in link — no password needed."
            : "Enter your email and password."}
        </p>

        <div className="mt-6 flex gap-4 border-b border-ink/10">
          <button
            type="button"
            onClick={() => setMode("magic")}
            className={`pb-2 text-sm font-medium transition-colors ${
              mode === "magic" ? "border-b-2 border-cyan text-cyan" : "text-ink-3 hover:text-ink"
            }`}
          >
            Magic link
          </button>
          <button
            type="button"
            onClick={() => setMode("password")}
            className={`pb-2 text-sm font-medium transition-colors ${
              mode === "password" ? "border-b-2 border-cyan text-cyan" : "text-ink-3 hover:text-ink"
            }`}
          >
            Password
          </button>
        </div>

        {notice && (
          <div className="card mt-4 bg-cyan/10 border-cyan/30">
            <p className="text-sm text-cyan">{notice}</p>
          </div>
        )}

        {mode === "magic" ? (
          <form
            className="mt-6 space-y-4"
            action={async (form) => {
              const result = await magicLink(form);
              if (result?.message) setNotice(result.message);
            }}
          >
            <input type="hidden" name="next" value={next} />
            <div>
              <label className="label" htmlFor="email-magic">
                Email
              </label>
              <input
                id="email-magic"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                placeholder="you@example.com"
              />
            </div>
            <button className="btn-primary w-full" type="submit">
              Email me a sign-in link
            </button>
          </form>
        ) : (
          <form
            className="mt-6 space-y-4"
            action={async (form) => {
              const result = await login(form);
              if (result?.message) setNotice(result.message);
            }}
          >
            <div>
              <label className="label" htmlFor="email-password">
                Email
              </label>
              <input
                id="email-password"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                className="input"
              />
            </div>
            <button className="btn-primary w-full" type="submit">
              Sign in with password
            </button>
          </form>
        )}

        <p className="mt-6 text-xs text-ink-3 text-center">
          100 Ixis = $1. Paid Ixis never expires.
        </p>
      </div>
    </div>
  );
}
