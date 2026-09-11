import type { ReactNode } from "react";

/** Fades + rises a section in on mount, staggered by `delayMs`. This used to
 *  be scroll-triggered via IntersectionObserver with the section starting at
 *  opacity:0 until it entered the viewport — but that gated *visibility* (not
 *  just motion) on JS actually firing: a full-page screenshot taken without
 *  scrolling, a user who scrolls fast, or a slow/broken script all left
 *  below-fold sections permanently blank. A CSS `animation` applied via
 *  inline style at render time (same technique the hero already used) has no
 *  such failure mode — it's part of the SSR'd markup from the first paint,
 *  runs once on mount regardless of scroll position, and needs no JS state
 *  or observer to make content visible. Motion becomes pure progressive
 *  enhancement: `prefers-reduced-motion` (globals.css) and even a fully
 *  broken client still leave every section visible. */
export default function Reveal({
  children,
  delayMs = 0,
  as: Tag = "div",
  className = "",
}: {
  children: ReactNode;
  delayMs?: number;
  as?: "div" | "li" | "span";
  className?: string;
}) {
  return (
    <Tag
      className={className}
      style={{ animation: `riseIn 550ms cubic-bezier(0.16,1,0.3,1) ${delayMs}ms both` }}
    >
      {children}
    </Tag>
  );
}
