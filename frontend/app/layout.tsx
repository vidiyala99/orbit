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

/** One face carries the whole product; weight does the hierarchy. Mono is
 *  loaded at a single weight because it only ever sets times and counts. */
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-plex-mono",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-serif",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${plexMono.variable} ${newsreader.variable}`}>
      <body className="bg-ground font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
