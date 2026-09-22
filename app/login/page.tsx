import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { SiteNav } from "@/components/SiteNav";

export default function LoginPage() {
  return (
    <div>
      <SiteNav />
      <Suspense fallback={<div className="mx-auto max-w-md px-6 py-16 text-ink-3">Loading…</div>}>
        <AuthForm />
      </Suspense>
    </div>
  );
}
