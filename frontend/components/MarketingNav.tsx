"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getClientToken } from "@/lib/auth";
import { APP_HOME } from "@/lib/routes";

type Page = "home" | "how-it-works" | "about";

const LINKS: { page: Page; label: string; href: string }[] = [
  { page: "home", label: "Home", href: "/" },
  { page: "how-it-works", label: "How it works", href: "/how-it-works" },
  { page: "about", label: "About", href: "/about" },
];

export default function MarketingNav({ active }: { active: Page }) {
  const [open, setOpen] = useState(false);
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
        <Link href="/" className="flex items-center gap-1.5 rounded-full font-display text-fl-base font-bold tracking-[-0.2px] text-ink lg:gap-2 lg:text-lg">
          <svg width="18" height="18" viewBox="0 0 22 22" aria-hidden="true" className="shrink-0 text-accent lg:h-5 lg:w-5">
            <circle cx="11" cy="11" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <ellipse cx="11" cy="11" rx="9.2" ry="3.35" fill="none" stroke="currentColor" strokeWidth="1.6" transform="rotate(-22 11 11)" />
          </svg>
          Orbit
        </Link>

        <div className="hidden items-center gap-5 text-fl-sm font-medium text-ink2 md:flex lg:gap-8">
          {LINKS.map((link) => (
            <Link
              key={link.page}
              href={link.href}
              aria-current={link.page === active ? "page" : undefined}
              className={`rounded-full transition-colors hover:text-ink ${
                link.page === active ? "font-bold text-accent" : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={signedIn ? APP_HOME : "/sign-in"}
            className="btn-press rounded-full border border-rule bg-surface px-4 py-1.5 text-fl-sm font-semibold text-ink transition-colors hover:border-accent hover:bg-accent-soft lg:px-5 lg:py-2"
          >
            {signedIn ? "Open app" : "Sign in"}
          </Link>
        </div>

        <button
          type="button"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="btn-press rounded-full border border-rule bg-surface px-4 py-1.5 text-fl-sm font-semibold text-ink transition-colors hover:border-accent hover:bg-accent-soft md:hidden"
        >
          Menu
        </button>
      </div>

      <div
        data-testid="mobile-drawer"
        hidden={!open}
        className="absolute left-0 right-0 top-full flex flex-col gap-3.5 border-b border-rule bg-surface p-4 text-fl-sm font-medium text-ink2 shadow-card md:hidden"
      >
        {LINKS.map((link) => (
          <Link
            key={link.page}
            href={link.href}
            aria-current={link.page === active ? "page" : undefined}
            className={`rounded-full transition-colors hover:text-ink ${
                link.page === active ? "font-bold text-accent" : ""
              }`}
          >
            {link.label}
          </Link>
        ))}
        <Link href={signedIn ? APP_HOME : "/sign-in"} className="rounded-full font-bold text-accent">
          {signedIn ? "Open app" : "Sign in"}
        </Link>
      </div>
      </nav>
    </>
  );
}
