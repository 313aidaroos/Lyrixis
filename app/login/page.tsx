import { Suspense } from "react";
import { SiteNav } from "@/components/SiteNav";
import { LoginForm } from "@/components/LoginForm";
import { SignInWithApixis } from "@/components/SignInWithApixis";

export default function LoginPage() {
  return (
    <div>
      <SiteNav />
      <Suspense fallback={<div className="mx-auto max-w-md px-6 py-16 text-ink-3">Loading…</div>}>
        <SignInWithApixis />
        <LoginForm />
      </Suspense>
    </div>
  );
}
