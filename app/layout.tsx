import type { Metadata } from "next";
import { Familjen_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { CixyWidget } from "@/components/CixyWidget";

const display = Familjen_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

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
      </body>
    </html>
  );
}
