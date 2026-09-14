"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_EVENTS, APP_HOME, APP_INBOX } from "@/lib/routes";

const TABS = [
  { href: APP_HOME, label: "Home", icon: "M3 9.5 10 3.5l7 6V17a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1V9.5Z" },
  { href: APP_EVENTS, label: "Events", icon: "M4 5h12v12H4zM4 8.5h12M7.5 3v3.5M12.5 3v3.5" },
  { href: APP_INBOX, label: "Inbox", icon: "M3.5 5h13v10h-13zM3.5 5.5 10 11l6.5-5.5" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** App destinations. Bottom bar on phones, inline links in the desktop header. */
export default function BadgeTabs({ variant, activeOverride }: { variant: "bottom" | "top"; activeOverride?: string }) {
  const pathname = activeOverride ?? usePathname() ?? "";
  return (
    <nav aria-label="Primary" className={variant === "bottom" ? "bw-tabbar" : "bw-topnav"}>
      {TABS.map((tab) => {
        const active = isActive(pathname, tab.href);
        return (
          <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined} className="bw-tab">
            {variant === "bottom" ? (
              <svg viewBox="0 0 20 20" aria-hidden="true" className="h-6 w-6">
                <path d={tab.icon} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
            ) : null}
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
