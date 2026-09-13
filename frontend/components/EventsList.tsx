"use client";

import Link from "next/link";
import type { EventT } from "@/lib/events";
import { eventFocusEndsAt } from "@/lib/events";
import { eventBrief } from "@/lib/eventBrief";
import { eventPath } from "@/lib/routes";

function syncAge(iso: string | null): string {
  if (!iso) return "Not synced";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "Just synced";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Synced just now";
  if (mins < 60) return `Synced ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `Synced ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Synced ${days}d ago`;
}

function liveChip(event: EventT, now: number): { label: string; live: boolean } {
  const start = new Date(event.starts_at).getTime();
  const end = eventFocusEndsAt(event);
  if (now >= start && now <= end) return { label: "Live", live: true };
  if (now < start) return { label: "Upcoming", live: false };
  return { label: "Past", live: false };
}

function EventRow({ event, delayMs = 0 }: { event: EventT; delayMs?: number }) {
  const now = Date.now();
  const chip = liveChip(event, now);
  const kind = eventBrief(event.title, event.location).kind;
  const guests = event.guest_count ?? 0;

  return (
    <li style={{ animation: `rowIn 220ms cubic-bezier(0.23,1,0.32,1) ${delayMs}ms both` }}>
      <Link
        href={eventPath(event.id)}
        className="btn-press flex items-center gap-4 rounded-md border border-ink/10 bg-surface-raised px-4 py-4 shadow-sm hover:border-ink/20 md:px-5 md:py-5"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={[
                "rounded-md px-2 py-0.5 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.06em]",
                chip.live ? "bg-accent text-white" : "bg-ink/[0.06] text-ink2",
              ].join(" ")}
            >
              {chip.label}
            </span>
            <span className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.06em] text-ink3">
              {kind}
            </span>
          </div>
          <p className="mt-1.5 truncate font-display text-[1.125rem] font-bold tracking-[-0.03em] text-ink md:text-[1.25rem]">
            {event.title}
          </p>
          {event.location ? (
            <p className="mt-0.5 truncate text-fl-sm text-ink2 md:text-[0.9375rem]">{event.location}</p>
          ) : null}
          <p className="mt-1.5 text-fl-xs text-ink3">
            <span className="font-mono tabular text-ink2">{guests}</span> guests
            <span className="mx-1.5 text-ink3/40" aria-hidden="true">
              ·
            </span>
            {syncAge(event.synced_at)}
          </p>
        </div>
        <span aria-hidden="true" className="shrink-0 text-fl-lg font-semibold text-ink3">
          →
        </span>
      </Link>
    </li>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="home-stage min-h-full w-full min-w-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1240px] px-4 py-4 md:px-8 md:py-6 lg:px-10">
        {children}
      </div>
    </main>
  );
}

export default function EventsList({ events }: { events: EventT[] }) {
  if (events.length === 0) {
    return (
      <Shell>
        <h1 className="font-display text-fl-xl font-bold tracking-[-0.04em] text-ink md:text-[1.75rem]">
          Events
        </h1>
        <p className="mt-3 max-w-xl text-fl-sm text-ink3">
          No synced events yet. Rooms show up here once guests are imported.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="max-w-3xl">
        <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink3">
          <span className="tabular text-ink">{events.length}</span>
          <span className="ml-1 normal-case tracking-normal">synced</span>
        </p>
        <h1 className="mt-1 font-display text-fl-xl font-bold tracking-[-0.04em] text-ink md:text-[1.75rem]">
          Events
        </h1>
        <p className="mt-1 text-fl-sm text-ink3">
          Pick a room to search guests by match.
        </p>
      </header>
      <ul className="mt-6 grid grid-cols-1 gap-3 md:mt-8 md:grid-cols-2 md:gap-4">
        {events.map((event, i) => (
          <EventRow key={event.id} event={event} delayMs={i * 25} />
        ))}
      </ul>
    </Shell>
  );
}
