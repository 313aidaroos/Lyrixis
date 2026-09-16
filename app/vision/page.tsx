import { FaqPanel } from "@/components/FaqPanel";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { VisionPanel } from "@/components/VisionPanel";

export default function VisionPage() {
  return (
    <div>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <VisionPanel />
        <div className="mt-16">
          <FaqPanel />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
