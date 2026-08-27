import { Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/** One face carries the whole product; weight does the hierarchy. Mono is
 *  loaded at a single weight because it only ever sets times and counts. */
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-plex-mono" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${plexMono.variable}`}>
      <body className="bg-ground font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
