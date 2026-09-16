import Link from "next/link";

export function BrandMark({ size = "nav" }: { size?: "nav" | "hero" }) {
  if (size === "hero") {
    return (
      <img
        src="/lyrixis-logo.png"
        alt="Lyrixis"
        className="mx-auto w-full max-w-[280px] rounded-[1.75rem] shadow-xl shadow-violet/20"
      />
    );
  }

  return (
    <Link href="/" className="flex items-center gap-3">
      <img
        src="/lyrixis-mark.png"
        alt=""
        className="h-11 w-11 rounded-xl object-cover shadow-sm ring-1 ring-black/10"
      />
      <span className="font-display text-lg font-semibold tracking-[0.18em] text-ink">LYRIXIS</span>
    </Link>
  );
}
