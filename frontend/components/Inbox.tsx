"use client";

/** Kept people — Operate list like Events. Act (email/DM) on person detail. */

import Link from "next/link";
import type { InboxPersonT } from "@/lib/events";
import { displayInitials } from "@/lib/displayAvatar";
import { guestHeadline } from "@/lib/guestHeadline";
import { APP_HOME, personPath } from "@/lib/routes";

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-full object-cover" />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink/[0.08] text-fl-xs font-semibold text-ink2"
    >
      {displayInitials(name)}
    </span>
  );
}

function InboxRow({ person, delayMs = 0 }: { person: InboxPersonT; delayMs?: number }) {
  const name = `${person.first_name} ${person.last_name}`.trim();
  const headline = guestHeadline(person.role);
  const why = person.why?.trim() || "";

  return (
    <li style={{ animation: `rowIn 220ms cubic-bezier(0.23,1,0.32,1) ${delayMs}ms both` }}>
      <Link
        href={personPath(person.id)}
        className="btn-press flex h-full items-start gap-3 rounded-md border border-ink/10 bg-surface-raised px-4 py-4 shadow-sm hover:border-ink/20 md:px-5 md:py-5"
      >
        <Avatar name={name} avatarUrl={person.avatar_url} />
        <span className="min-w-0 flex-1">
          {person.event_title ? (
            <span className="inline-flex max-w-full truncate rounded-md bg-ink/[0.06] px-2 py-0.5 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.06em] text-ink2">
              {person.event_title}
            </span>
          ) : (
            <span className="inline-flex rounded-md bg-accent/10 px-2 py-0.5 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.06em] text-accent">
              Kept
            </span>
          )}
          <span className="mt-1.5 block truncate font-display text-[1.125rem] font-bold leading-tight tracking-[-0.03em] text-ink md:text-[1.25rem]">
            {name}
          </span>
          {headline ? (
            <span className="mt-1 line-clamp-2 block text-[0.9375rem] font-semibold leading-snug tracking-[-0.015em] text-ink">
              {headline}
            </span>
          ) : (
            <span className="mt-1 block text-[0.8125rem] font-medium text-ink3">Role not on Luma</span>
          )}
          {why ? (
            <span className="mt-2.5 block border-t border-ink/[0.06] pt-2.5">
              <span className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-ink3">
                Why keep
              </span>
              <span className="mt-0.5 line-clamp-2 block text-[0.8125rem] leading-snug text-ink2">
                {why}
              </span>
            </span>
          ) : null}
        </span>
        <span aria-hidden="true" className="shrink-0 self-center text-fl-lg font-semibold text-ink3">
          →
        </span>
      </Link>
    </li>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="home-stage min-h-full w-full min-w-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1240px] px-4 py-4 md:px-8 md:py-6 lg:px-10">{children}</div>
    </main>
  );
}

export default function Inbox({ people }: { people: InboxPersonT[] }) {
  if (people.length === 0) {
    return (
      <Shell>
        <h1 className="font-display text-fl-xl font-bold tracking-[-0.04em] text-ink md:text-[1.75rem]">
          Inbox
        </h1>
        <p className="mt-3 max-w-xl text-fl-sm text-ink3">
          Empty for now. Keep someone on Home and they land here to draft email or copy a DM.
        </p>
        <Link
          href={APP_HOME}
          className="btn-press mt-4 inline-flex min-h-11 items-center text-fl-sm font-semibold text-accent hover:underline"
        >
          ← Home
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="max-w-3xl">
        <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink3">
          <span className="tabular text-ink">{people.length}</span>
          <span className="ml-1 normal-case tracking-normal">kept</span>
        </p>
        <h1 className="mt-1 font-display text-fl-xl font-bold tracking-[-0.04em] text-ink md:text-[1.75rem]">
          Inbox
        </h1>
        <p className="mt-1 text-fl-sm text-ink3">Open someone to draft email or copy a DM.</p>
      </header>
      {/* Same density as Events rooms — 2-col on desktop, not a lonely 1/3 card. */}
      <ul className="mt-6 grid grid-cols-1 gap-3 md:mt-8 md:grid-cols-2 md:gap-4">
        {people.map((p, i) => (
          <InboxRow key={p.id} person={p} delayMs={i * 25} />
        ))}
      </ul>
    </Shell>
  );
}
