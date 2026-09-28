import { Suspense } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SupportForm } from "@/components/SupportForm";

export default function SupportPage() {
  return (
    <div>
      <SiteNav />
      <Suspense fallback={<div className="mx-auto max-w-md px-6 py-16 text-ink-3">Loading…</div>}>
        <SupportForm />
      </Suspense>
    </div>
  );
}
