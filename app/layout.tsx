import type { Metadata } from "next";
import { Familjen_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

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
  title: "Lyrixis",
  description: "Search music metadata and lyrics. Catalog intelligence at scale.",
  icons: { icon: "/favicon.png" },
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
      </body>
    </html>
  );
}
