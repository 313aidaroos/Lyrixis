"use client";
// 2026-09-28 Grok Developer Bot: reset mode (?reset=1) for "Forgot password?", confirm field,
// expired-link recovery, and Cixy sign-in help beside the form.
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { setPassword } from "@/app/login/actions";
import { SiteNav } from "@/components/SiteNav";
import { CixyLoginHelp } from "@/components/CixyLoginHelp";

export const dynamic = "force-dynamic";

function SetPasswordInner() {
  const params = useSearchParams();
  const raw = params.get("next") ?? "/";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  const reset = params.get("reset") === "1";
  const [notice, setNotice] = useState("");
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div className="mx-auto grid max-w-5xl items-start gap-6 px-6 py-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:py-16">
      <div className="page-panel">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">{reset ? "Lyrixis · Reset password" : "Lyrixis"}</p>
        <h1 className="mt-3 font-display text-3xl font-bold">{reset ? "Choose a new password" : "Choose a password"}</h1>
        <p className="mt-2 text-sm text-ink-2">
          {reset
            ? "Pick a new password for your account. It works on every Apixis site that uses your Apixis ID."
            : "Next time you sign in without waiting for an email."}
        </p>

        <form
          className="mt-6 space-y-4"
          noValidate
          onSubmit={async (event) => {
            // onSubmit (not a form action) so a typo doesn't wipe both fields.
            event.preventDefault();
            setNotice("");
            const form = new FormData(event.currentTarget);
            const password = String(form.get("password") ?? "");
            if (password.length < 8) return setNotice("Password must be at least 8 characters.");
            if (password !== String(form.get("confirm") ?? "")) return setNotice("The two passwords don't match.");
            setBusy(true);
            try {
              const result = await setPassword(form); // redirects on success
              if (result?.message) {
                setExpired(Boolean(result.expired));
                setNotice(result.expired && reset ? "This reset link has expired or was already used." : result.message);
              }
            } catch (e) {
              if (e && typeof e === "object" && "digest" in e && String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) throw e;
              setNotice("Network error. Please try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="label" htmlFor="new-password">New password</label>
            <input id="new-password" name="password" type="password" autoComplete="new-password" required minLength={8}
              className="input" placeholder="At least 8 characters" autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="confirm-password">Confirm new password</label>
            <input id="confirm-password" name="confirm" type="password" autoComplete="new-password" required minLength={8} className="input" />
          </div>
          {notice && (
            <p role="alert" className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{notice}</p>
          )}
          {expired && (
            <Link href={reset ? "/login?mode=forgot" : "/login"} className="btn-secondary w-full justify-center py-2.5 text-sm">
              {reset ? "Email me a new reset link" : "Send a new sign-in link"}
            </Link>
          )}
          <div className="flex items-center gap-3">
            <button className="btn-primary flex-1" type="submit" disabled={busy}>
              {busy ? "Saving…" : reset ? "Save new password" : "Save password"}
            </button>
            {!reset && (
              <Link href={next} className="text-sm text-ink-3 transition-colors hover:text-cyan">
                Skip for now →
              </Link>
            )}
          </div>
        </form>
      </div>
      <CixyLoginHelp />
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <div>
      <SiteNav />
      <Suspense fallback={<div className="mx-auto max-w-md px-6 py-16 text-ink-3">Loading…</div>}>
        <SetPasswordInner />
      </Suspense>
    </div>
  );
}
