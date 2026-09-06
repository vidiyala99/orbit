"use client";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    setSignedIn(getClientToken() !== null);
  }, []);

  return (
    <nav className="sticky top-0 z-10 border-b border-rule bg-ground/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 lg:px-8 lg:py-5">
        <Link href="/" className="flex items-center gap-[7px] rounded-full text-sm font-bold text-ink lg:gap-2 lg:text-lg">
          <span className="h-2 w-2 rounded-full bg-accent lg:h-2.5 lg:w-2.5" aria-hidden="true" />
          Orbit
        </Link>

        <div className="hidden items-center gap-5 text-[12px] font-medium text-ink2 md:flex lg:gap-8 lg:text-sm">
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
            className="btn-press rounded-full border border-rule bg-surface px-4 py-1.5 text-[12px] font-semibold text-ink transition-colors hover:border-accent hover:bg-accent-soft lg:px-5 lg:py-2 lg:text-sm"
          >
            {signedIn ? "Open app" : "Sign in"}
          </Link>
        </div>

        <button
          type="button"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="btn-press rounded-full border border-rule bg-surface px-4 py-1.5 text-[12px] font-semibold text-ink transition-colors hover:border-accent hover:bg-accent-soft md:hidden"
        >
          Menu
        </button>
      </div>

      <div
        data-testid="mobile-drawer"
        hidden={!open}
        className="absolute left-0 right-0 top-full flex flex-col gap-3.5 border-b border-rule bg-surface p-4 text-[13px] font-medium text-ink2 shadow-card md:hidden"
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
  );
}
