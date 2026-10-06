import type { Metadata } from "next";
import { Manrope, Martian_Mono, Unbounded } from "next/font/google";
import "./globals.css";
import { CixyWidget } from "@/components/CixyWidget";
import { CixyPageHelp } from "@/components/CixyPageHelp";

// 2026-10-05 font refresh preview (Grok, DO NOT MERGE until Awad approves):
// display = Unbounded (wide geometric, neon-sign energy), body = Manrope (very readable),
// mono = Martian Mono (wide mono that rhymes with Unbounded). Was Special Elite everywhere.
const display = Unbounded({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Manrope({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const mono = Martian_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Lyrixis — The intelligence layer for music catalogs",
  description:
    "Lyrixis turns music into structured, synchronized, distribution-ready intelligence — one song or millions at a time.",
  icons: { icon: "/favicon.png" },
  openGraph: {
    title: "Lyrixis — Music. Understood.",
    description: "Search lyrics, metadata, ISRC/ISWC, and synced intelligence for any catalog.",
    images: ["/lyrixis-logo.png"],
  },
};

export const viewport = {
  themeColor: "#07061a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${mono.variable} font-body antialiased`}>
        <div className="site-stage" aria-hidden="true" />
        {children}
        <CixyWidget />
        <CixyPageHelp />
      </body>
    </html>
  );
}
