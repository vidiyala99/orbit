"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountMenu from "./AccountMenu";

type Tab = { href: string; label: string };

/** The two signed-in destinations that exist today. Extend this list (and
 *  nothing else) when a third app section ships. */
const TABS: Tab[] = [
  { href: "/home", label: "Home" },
  { href: "/attendees", label: "Attendees" },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** OrbitMark — the one recurring shape (ring + tilted orbit), same treatment
 *  as the marketing/auth pages. Every other route carries this brand anchor;
 *  the tab bar is the one piece of chrome present on every signed-in screen,
 *  so it carries it here instead of repeating it per-page. Quiet by design
 *  (tab-idle tone, no link) — Operate mode keeps brand to a precise detail,
 *  not a flourish. */
function OrbitMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 22 22" aria-hidden="true" className="shrink-0 text-tab-idle">
      <circle cx="11" cy="11" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="11" cy="11" rx="9.2" ry="3.35" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(-22 11 11)" />
    </svg>
  );
}

/** Bottom tab bar for the signed-in app shell. Self-hides on every marketing
 *  and auth route by checking the pathname directly rather than living in a
 *  route group — see CLAUDE.md task note on not restructuring under time
 *  pressure. Mounted once in the root layout, after `{children}`, as the
 *  last item of a flex column `body` that's locked to exactly one viewport
 *  tall (see layout.tsx) — deliberately NOT `position: fixed`/`sticky`. A
 *  fixed bar always covers the bottom ~55px of the viewport regardless of
 *  scroll position, which overlaps real interactive content (e.g. the
 *  shortlist deck's Skip/Follow-up buttons) on any page whose content lands
 *  close to viewport height, since the browser never auto-scrolls a short
 *  page's trailing padding into view. Here `{children}` scrolls in its own
 *  bounded pane above this bar, so the bar always has real, reserved layout
 *  height at the true bottom of the screen and can never render on top of
 *  the pane's content — while still reading as "always visible," since it's
 *  outside the scrolling pane entirely rather than needing to stay pinned
 *  during a scroll that never touches it. */
export default function AppNav() {
  const pathname = usePathname() ?? "";
  const isAppRoute = TABS.some((tab) => isActive(pathname, tab.href));
  if (!isAppRoute) return null;

  return (
    <nav
      aria-label="Primary"
      className="border-t border-rule bg-ink pb-[env(safe-area-inset-bottom)] shadow-tabbar"
    >
      <div className="mx-auto flex max-w-[1440px] items-center gap-2 px-4 py-2">
        <OrbitMark />
        <div className="flex flex-1 items-center justify-around gap-2">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`btn-press rounded-full px-5 py-2 text-fl-sm font-semibold transition-colors ${
                active ? "bg-accent-soft text-ink" : "text-tab-idle hover:text-white"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
        </div>
        <AccountMenu />
      </div>
    </nav>
  );
}
