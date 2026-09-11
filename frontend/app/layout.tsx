import type { Metadata } from "next";
import { Public_Sans, JetBrains_Mono, Bricolage_Grotesque } from "next/font/google";
import AppNav from "@/components/AppNav";
import "./globals.css";

const LINE = "Personal communications manager - memory that closes the loop.";

export const metadata: Metadata = {
  title: "Orbit",
  description: LINE,
  openGraph: { title: "Orbit", description: LINE },
  twitter: { title: "Orbit", description: LINE },
};

/** Humanist body face, warm x-height, deliberately not Inter. */
const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
});
/** Mono, loaded at a single weight because it only ever sets times and
 *  counts. */
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-jetbrains-mono",
});
/** Grotesque sans for headlines only — enough personality (irregular
 *  terminals, ink-trap joints at weight) to carry a display role without
 *  reading as a serif costume. Not used for body copy. */
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${publicSans.variable} ${jetbrainsMono.variable} ${bricolage.variable}`}>
      <body className="flex h-dvh flex-col overflow-hidden bg-ground font-sans text-ink antialiased">
        {/* App-shell layout, not a fixed/absolute overlay: the body is
            locked to exactly one viewport tall, this wrapper is the flex
            item that scrolls internally (`min-h-0` lets it shrink to fit
            the column instead of pushing the column past 100dvh), and
            AppNav (below) is a normal, non-fixed flex sibling after it. That
            guarantees AppNav always has real reserved height at the true
            bottom of the screen and can never render on top of this
            wrapper's last visible row — the bug a `position: fixed` bar has
            on any page whose content lands within one tab-bar-height of the
            viewport edge, since the browser never auto-scrolls a short
            page's trailing padding into view. Marketing routes render
            `null` from AppNav, so this is a no-op for them beyond turning
            "the body scrolls" into "this div scrolls" — same visual result. */}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        <AppNav />
      </body>
    </html>
  );
}
