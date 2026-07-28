import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
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
    images: [{ url: "/og.png", width: 1200, height: 630 }],
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
      <body className={`${geist.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
