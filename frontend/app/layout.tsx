import type { Metadata } from "next";
import { Manrope, IBM_Plex_Mono, Newsreader } from "next/font/google";
import "./globals.css";

const LINE = "Personal communications manager - memory that closes the loop.";

export const metadata: Metadata = {
  title: "Orbit",
  description: LINE,
  openGraph: { title: "Orbit", description: LINE },
  twitter: { title: "Orbit", description: LINE },
};

/** Manrope still carries the product UI. Newsreader is the landing wordmark
 *  and promise; Plex Mono stays on functional lines (met-at, captions). */
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-plex-mono",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${newsreader.variable} ${plexMono.variable}`}>
      <body className="bg-ground font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
