import { requireUser } from "@/lib/auth";
import { AppNav } from "@/components/AppNav";
import { UploadForm } from "@/components/UploadForm";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const user = await requireUser();
  return (
    <div>
      <AppNav email={user.email} />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Single track</p>
        <h1 className="mt-2 font-display text-4xl font-bold">Upload</h1>
        <p className="mt-3 text-ink-2">
          One file, rights confirmation required. Processing runs on the worker queue — this page returns as soon as
          the file is stored.
        </p>
        <div className="mt-8">
          <UploadForm />
        </div>
      </main>
    </div>
  );
}
