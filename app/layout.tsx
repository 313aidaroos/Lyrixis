import type { Metadata } from "next";
import { Special_Elite } from "next/font/google";
import "./globals.css";
import { CixyWidget } from "@/components/CixyWidget";

const specialElite = Special_Elite({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-special-elite",
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
      <body className={`${specialElite.variable} font-special-elite antialiased`}>
        <div className="site-stage" aria-hidden="true" />
        {children}
        <CixyWidget />
      </body>
    </html>
  );
}
