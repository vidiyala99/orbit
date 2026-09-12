"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getClientToken } from "@/lib/auth";
import { APP_HOME } from "@/lib/routes";
import BrandMark from "./BrandMark";

export default function MarketingNav() {
  const [signedIn, setSignedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSignedIn(getClientToken() !== null);
  }, []);

  /** A 1px sentinel above the sticky nav, not a scroll listener - this only
   *  fires once at the threshold crossing rather than every scroll frame. */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" />
      <nav
        className={`sticky top-0 z-10 border-b bg-ground/90 backdrop-blur transition-shadow duration-300 ${
          scrolled ? "border-rule shadow-card" : "border-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 lg:px-8 lg:py-5">
          <Link href="/" className="flex items-center gap-1.5 rounded-md font-display text-fl-base font-bold tracking-[-0.02em] text-ink lg:gap-2 lg:text-lg">
            <BrandMark size={18} className="text-accent lg:h-5 lg:w-5" />
            Actintro
          </Link>

          <Link
            href={signedIn ? APP_HOME : "/sign-in"}
            className="btn-press rounded-md border border-rule bg-surface px-4 py-1.5 text-fl-sm font-semibold text-ink transition-colors hover:border-accent hover:bg-accent-soft lg:px-5 lg:py-2"
          >
            {signedIn ? "Open app" : "Sign in"}
          </Link>
        </div>
      </nav>
    </>
  );
}
