import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

export function CatalogNav({ tab = "catalog" }: { tab?: string }) {
  const pill = (id: string) => `tab-pill ${tab === id ? "tab-pill-on" : "tab-pill-off"}`;

  return (
    <header className="border-b border-line/80 bg-white/75 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-3">
        <BrandMark />
        <nav className="flex flex-wrap items-center gap-2">
          <Link href="/" className={pill("catalog")}>
            Catalog
          </Link>
          <Link href="/?tab=vision" className={pill("vision")}>
            Our vision
          </Link>
          <Link href="/?tab=faq" className={pill("faq")}>
            FAQ
          </Link>
          <Link href="/add" className="tab-pill tab-pill-off">
            Add
          </Link>
          <Link href="/login" className="tab-pill tab-pill-off">
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
