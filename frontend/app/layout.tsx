import type { Metadata } from "next";
import { Syne, IBM_Plex_Sans, JetBrains_Mono, Big_Shoulders, Carlito } from "next/font/google";
import AppNav from "@/components/AppNav";
import "./globals.css";
import "./badge-world.css";

const LINE = "Match the right people. Act on the intro.";

export const metadata: Metadata = {
  title: "Actintro",
  description: LINE,
  openGraph: { title: "Actintro", description: LINE },
  twitter: { title: "Actintro", description: LINE },
};

/** Display = Syne (alive); body = IBM Plex Sans (readable, not Inter). */
const syne = Syne({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
});
const ibmPlex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-jetbrains-mono",
});

/** Badge world (redesign): condensed badge names + a plain UI face, matched to the approved comp. */
const bigShoulders = Big_Shoulders({
  subsets: ["latin"],
  variable: "--font-badge-name",
});
const carlito = Carlito({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-badge-ui",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${ibmPlex.variable} ${jetbrainsMono.variable} ${bigShoulders.variable} ${carlito.variable}`}
    >
      <body className="flex h-dvh max-w-[100vw] flex-col overflow-hidden overflow-x-hidden bg-ground font-sans text-ink antialiased">
        <div className="grain-overlay" aria-hidden="true" />
        <AppNav />
        {/* Definite height under nav. Pages that scroll (Inbox, Attendees) own overflow-y-auto. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden overflow-x-hidden">{children}</div>
      </body>
    </html>
  );
}
