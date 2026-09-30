import { requireUser } from "@/lib/auth";
import { AppNav } from "@/components/AppNav";
import { ReleaseWizard } from "@/components/ReleaseWizard";

export const dynamic = "force-dynamic";

export default async function ReleasePage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  return (
    <div>
      <AppNav email={user.email} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Release Tool</p>
        <h1 className="mt-2 font-display text-4xl font-bold">Release-ready in 10 minutes</h1>
        <p className="mt-3 text-ink-2">
          Upload a track, verify the AI lyrics, add your metadata and split sheet, pay in Ixis —
          and download a distributor-ready release package.
        </p>
        <div className="mt-8">
          <ReleaseWizard initialTrackPublicId={params.track ?? null} />
        </div>
      </main>
    </div>
  );
}
