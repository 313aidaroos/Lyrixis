import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Familjen_Grotesk } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";

const display = Familjen_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
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
  title: "Lyrixis — Music. Understood.",
  description:
    "Upload a song. Get synchronized lyrics, metadata, structure, and DDEX-ready exports back.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="font-body antialiased">
        <Nav />
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  );
}
