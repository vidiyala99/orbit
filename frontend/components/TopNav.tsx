"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SECTIONS, isActiveSection } from "@/lib/nav";
import UserMenu from "./UserMenu";

/** Desktop nav for the signed-in sections — `md` and up only; below that
 *  `BottomTabNav` carries the same four links as a phone tab bar.
 *
 *  Fixed rather than sticky because the signed-in pages are `max-w-md`
 *  columns: a sticky bar inside one would only span the column. Pages that
 *  render it need `md:pt-16` so their first row clears the 52px bar with
 *  room to breathe.
 *
 *  Three-column grid rather than `justify-between`: the links are optically
 *  centred over the `max-w-md` content column instead of drifting with the
 *  width of the wordmark and the sign-out cluster. */
export default function TopNav({ userInitial }: { userInitial?: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 top-0 z-20 hidden h-[52px] border-b border-rule bg-ground/85 backdrop-blur md:flex"
    >
      <div className="mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-stretch px-6">
        <Link
          href="/"
          className="flex w-fit items-center gap-2 self-center text-[14.5px] font-bold tracking-[-0.2px] text-ink"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          Orbit
        </Link>

        {/* `gap-4` + `px-2` on each link rather than a bare `gap-7`: same ~32px
            of air between labels, but the padding belongs to the tab, so the
            active underline and the focus ring both get room around the text. */}
        <ul className="flex items-stretch gap-4">
          {SECTIONS.map((section) => {
            const active = isActiveSection(pathname, section.href);
            return (
              <li key={section.href} className="flex">
                <Link
                  href={section.href}
                  aria-current={active ? "page" : undefined}
                  /* `-mb-px` drops the 2px accent onto the bar's 1px rule so the
                     active tab reads as one line, not two stacked ones.
                     The tab fills the bar's height, so the global focus ring's
                     +2px offset would be clipped by the top of the viewport —
                     pulled inside instead. */
                  className={`-mb-px flex items-center gap-[7px] border-b-2 px-2 text-[13px] leading-none transition-colors duration-150 focus-visible:[outline-offset:-4px]! ${
                    active
                      ? "border-accent font-bold text-ink"
                      : "border-transparent font-medium text-ink2 hover:border-rule hover:text-ink"
                  }`}
                >
                  <span
                    data-tab-icon
                    aria-hidden="true"
                    className={`text-[11px] leading-none opacity-85 ${
                      active ? "text-accent" : "text-ink3"
                    }`}
                  >
                    {section.icon}
                  </span>
                  {section.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-end gap-2.5 justify-self-end">
          <UserMenu />
          {userInitial && (
            <span
              data-testid="top-nav-avatar"
              aria-hidden="true"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-[11px] font-bold text-accent"
            >
              {userInitial}
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}
