"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="font-display text-3xl font-bold">Something went wrong</h1>
      <p className="mt-4 text-ink-2">{error.message || "Unexpected error."}</p>
      <button className="btn-primary mt-8" type="button" onClick={() => reset()}>
        Try again
      </button>
    </main>
  );
}
