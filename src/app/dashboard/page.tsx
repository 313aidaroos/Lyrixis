import Link from "next/link";
import { listTracks } from "@/services/tracks";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const tracks = listTracks();

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold">Dashboard</h1>
          <p className="mt-2 text-ink-2">All processed tracks</p>
        </div>
        <Link href="/upload" className="btn-primary">
          New upload
        </Link>
      </div>

      <div className="card mt-10 overflow-hidden !p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-[#0c0a14] text-ink-3">
            <tr>
              <th className="px-6 py-4 font-medium">Title</th>
              <th className="px-6 py-4 font-medium">Artist</th>
              <th className="px-6 py-4 font-medium">Type</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {tracks.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-ink-3">
                  No tracks yet.{" "}
                  <Link href="/upload" className="text-violet hover:underline">
                    Upload your first song
                  </Link>
                </td>
              </tr>
            ) : (
              tracks.map((t) => (
                <tr
                  key={t.public_id}
                  className="border-b border-line/50 transition hover:bg-surface/50"
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/tracks/${t.public_id}`}
                      className="font-medium text-ink hover:text-violet"
                    >
                      {t.title || "Untitled"}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-ink-2">{t.artist}</td>
                  <td className="px-6 py-4 capitalize text-ink-3">{t.account_type}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-ink-3">
                    {new Date(t.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: "bg-emerald-500/20 text-emerald-400",
    failed: "bg-rose-500/20 text-rose-400",
    manual_review: "bg-amber-500/20 text-amber-400",
    queued: "bg-cyan/20 text-cyan",
    processing: "bg-violet/20 text-violet",
    transcribing: "bg-violet/20 text-violet",
    analyzing: "bg-violet/20 text-violet",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${colors[status] || "bg-ink-3/20 text-ink-3"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
