"use client";
import { useState } from "react";
import Link from "next/link";

type Page = "home" | "how-it-works" | "about";

const LINKS: { page: Page; label: string; href: string }[] = [
  { page: "home", label: "Home", href: "/" },
  { page: "how-it-works", label: "How it works", href: "/how-it-works" },
  { page: "about", label: "About", href: "/about" },
];

export default function MarketingNav({ active }: { active: Page }) {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-10 flex items-center justify-between border-b border-rule bg-card px-5 py-3">
      <Link href="/" className="flex items-center gap-1.5 font-display text-sm font-bold text-ink">
        <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
        StayConnected
      </Link>

      <div className="hidden gap-4 font-mono text-[10px] uppercase text-ink2 md:flex">
        {LINKS.map((link) => (
          <Link
            key={link.page}
            href={link.href}
            aria-current={link.page === active ? "page" : undefined}
            className={link.page === active ? "font-bold text-accent" : ""}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <button
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="btn-press rounded-full border border-rule px-3 py-1.5 font-mono text-[10px] uppercase text-ink md:hidden"
      >
        Menu
      </button>

      <div
        data-testid="mobile-drawer"
        hidden={!open}
        className="absolute left-0 right-0 top-full flex flex-col gap-3 border-b border-rule bg-card p-4 font-mono text-xs uppercase text-ink2 md:hidden"
      >
        {LINKS.map((link) => (
          <Link
            key={link.page}
            href={link.href}
            aria-current={link.page === active ? "page" : undefined}
            className={link.page === active ? "font-bold text-accent" : ""}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
