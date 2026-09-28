import { Suspense } from "react";
// 2026-09-28 Grok Developer Bot: /signup used a second "Sign in" form; it now shares LoginForm.
import { LoginForm } from "@/components/LoginForm";
import { SiteNav } from "@/components/SiteNav";

export default function SignupPage() {
  return (
    <div>
      <SiteNav />
      <Suspense fallback={<div className="mx-auto max-w-md px-6 py-16 text-ink-3">Loading…</div>}>
        <LoginForm variant="signup" />
      </Suspense>
    </div>
  );
}
