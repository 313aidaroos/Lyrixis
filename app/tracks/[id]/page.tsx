import { requireUser } from "@/lib/auth";
import { AppNav } from "@/components/AppNav";
import { TrackView } from "@/components/TrackView";

export const dynamic = "force-dynamic";

export default async function TrackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  return (
    <div>
      <AppNav email={user.email} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <TrackView publicId={id} />
      </main>
    </div>
  );
}
