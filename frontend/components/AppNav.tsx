"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountMenu from "./AccountMenu";
import BrandMark from "./BrandMark";
import { APP_EVENTS, APP_HOME, APP_INBOX } from "@/lib/routes";

type Tab = { href: string; label: string };

const TABS: Tab[] = [
  { href: APP_HOME, label: "Home" },
  { href: APP_EVENTS, label: "Events" },
  { href: APP_INBOX, label: "Inbox" },
];

function isActive(pathname: string, href: string): boolean {
  if (pathname.startsWith("/people/")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function showAppNav(pathname: string): boolean {
  return (
    TABS.some((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`)) ||
    pathname.startsWith("/people/")
  );
}

/**
 * Top chrome — distinct raised strip (like mobile Why meet), not floating
 * low-contrast links. Destinations only; Keep/Sync stay on the Focus stage.
 */
export default function AppNav() {
  const pathname = usePathname() ?? "";
  // Redesigned Home owns its own chrome (header + bottom tabs).
  if (pathname === APP_HOME || !showAppNav(pathname)) return null;

  return (
    <nav
      aria-label="Primary"
      className="shrink-0 overflow-x-hidden border-b border-ink/15 bg-surface-raised/95 shadow-[0_1px_0_rgba(16,20,28,0.04)] backdrop-blur-md pt-[env(safe-area-inset-top)]"
    >
      <div className="mx-auto flex h-[3.25rem] w-full max-w-[1280px] min-w-0 items-center gap-2 px-4 sm:h-[3.5rem] sm:gap-3 md:gap-5 md:px-8 lg:px-10">
        <Link
          href={APP_HOME}
          className="btn-press inline-flex shrink-0 items-center gap-2 text-ink"
          aria-label="Actintro home"
        >
          <BrandMark size={20} className="text-accent" />
          <span className="hidden font-display text-[1.125rem] font-bold tracking-[-0.04em] sm:inline">
            Actintro
          </span>
        </Link>

        <div
          role="tablist"
          aria-label="App sections"
          className="flex min-w-0 flex-1 items-center justify-center overflow-x-auto"
        >
          <div className="inline-flex max-w-full shrink items-center gap-0.5 rounded-md border border-ink/10 bg-ink/[0.05] p-0.5 sm:p-1">
            {TABS.map((tab) => {
              const active = isActive(pathname, tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  role="tab"
                  aria-selected={active}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "btn-press relative min-h-9 shrink-0 rounded-[6px] px-2.5 py-1.5 text-[0.75rem] font-semibold tracking-[-0.01em] transition-colors sm:px-3.5 sm:text-[0.8125rem]",
                    active
                      ? "bg-surface-raised text-ink shadow-sm ring-1 ring-ink/10"
                      : "text-ink2 hover:bg-ink/[0.06] hover:text-ink",
                  ].join(" ")}
                >
                  {tab.label}
                  {active ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-2 bottom-1 h-[2px] rounded-full bg-accent sm:inset-x-3.5"
                    />
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="shrink-0">
          <AccountMenu />
        </div>
      </div>
    </nav>
  );
}
