"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { setPassword } from "@/app/login/actions";

export const dynamic = "force-dynamic";

function SetPasswordInner() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [notice, setNotice] = useState("");

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="page-panel">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Lyrixis</p>
        <h1 className="mt-3 font-display text-3xl font-bold">Choose a password</h1>
        <p className="mt-2 text-sm text-ink-2">
          Next time you sign in without waiting for an email.
        </p>

        {notice && (
          <div className="card mt-4 bg-red/10 border-red/30">
            <p className="text-sm text-red">{notice}</p>
          </div>
        )}

        <form
          className="mt-6 space-y-4"
          action={async (form) => {
            const result = await setPassword(form);
            if (result?.message) setNotice(result.message);
          }}
        >
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="input"
              placeholder="At least 8 characters"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-primary flex-1" type="submit">
              Save password
            </button>
            <Link href={next} className="text-sm text-ink-3 hover:text-cyan transition-colors">
              Skip for now →
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-6 py-16 text-ink-3">Loading…</div>}>
      <SetPasswordInner />
    </Suspense>
  );
}
