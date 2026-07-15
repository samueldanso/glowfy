import type { Metadata } from "next";
import { EB_Garamond, Geist_Mono } from "next/font/google";
import "./globals.css";

const garamond = EB_Garamond({
  variable: "--font-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Glowfy — AI Skin Coach",
  description:
    "Database-backed skincare intelligence. Photo or text in, expert analysis out. Six tools. No subscriptions. Pay per call on OKX.AI.",
  openGraph: {
    title: "Glowfy — AI Skin Coach",
    description: "Scan. Score. Glow. The AI skincare agent on OKX.AI.",
    siteName: "Glowfy",
  },
  twitter: {
    card: "summary_large_image",
    title: "Glowfy — AI Skin Coach",
    description: "Scan. Score. Glow.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${garamond.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
