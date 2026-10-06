import type { Metadata } from "next";
import { Manrope, Martian_Mono, Monoton } from "next/font/google";
import "./globals.css";
import { CixyWidget } from "@/components/CixyWidget";
import { CixyPageHelp } from "@/components/CixyPageHelp";

// 2026-10-05 font refresh preview (Grok, DO NOT MERGE until Awad approves). Awad picked Monoton:
// marquee = Monoton, ONLY for big headlines (hero + page titles, about 40px and up, via .font-marquee
// / sm:font-marquee); display = Manrope 800 for every smaller heading, price and number;
// body = Manrope; mono = Martian Mono. Was Special Elite everywhere.
const marquee = Monoton({ subsets: ["latin"], weight: "400", variable: "--font-marquee", display: "swap" });
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
      <body className={`${marquee.variable} ${body.variable} ${mono.variable} font-body antialiased`}>
        <div className="site-stage" aria-hidden="true" />
        {children}
        <CixyWidget />
        <CixyPageHelp />
      </body>
    </html>
  );
}
