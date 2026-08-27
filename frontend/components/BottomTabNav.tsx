"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SECTIONS, isActiveSection } from "@/lib/nav";

/** Fixed bottom tab bar for the signed-in sections — phone widths only; from
 *  `md` up `TopNav` carries the same four links instead.
 *
 *  Pages that render it need bottom padding so the last card clears it. */
export default function BottomTabNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sections"
      className="fixed left-1/2 z-20 w-[calc(100%-36px)] max-w-[28rem] -translate-x-1/2 rounded-full bg-ink p-[5px] shadow-tabbar md:hidden"
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <ul className="flex items-stretch">
        {SECTIONS.map((tab) => {
          const active = isActiveSection(pathname, tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`btn-press flex flex-col items-center gap-0.5 rounded-full py-2 text-[10.5px] transition-colors duration-150 ${
                  active
                    ? "bg-ground font-bold text-ink"
                    : "font-medium text-tab-idle hover:bg-white/10 hover:text-ground"
                }`}
              >
                <span
                  data-tab-icon
                  aria-hidden="true"
                  className={`block text-[13px] leading-none ${
                    active ? "text-accent" : "text-tab-idle"
                  }`}
                >
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
