"use client";

import Link from "next/link";
import type { EventT, HomeDataT, InboxPersonT } from "@/lib/events";
import { eventFocusEndsAt } from "@/lib/events";
import { eventBrief } from "@/lib/eventBrief";
import { APP_EVENTS, APP_INBOX, eventPath, personPath } from "@/lib/routes";
import FollowUpFocus from "./FocusCard";

function formatDay(iso: string): { num: string; mon: string } {
  const d = new Date(iso);
  return {
    num: String(d.getDate()).padStart(2, "0"),
    mon: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
  };
}

function startsLabel(iso: string): string {
  const start = new Date(iso).getTime();
  const ms = start - Date.now();
  if (ms <= 0) return "happening now";
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return "starts today";
  if (days === 1) return "starts tomorrow";
  return `starts in ${days} days`;
}

function featuredStatusLabel(event: EventT): string {
  const now = Date.now();
  const start = new Date(event.starts_at).getTime();
  const end = eventFocusEndsAt(event);
  if (now >= start && now <= end) return "happening now";
  if (now < start) return startsLabel(event.starts_at);
  return "recently synced";
}

function PastEventCard({ event, delayMs = 0 }: { event: EventT; delayMs?: number }) {
  const { num, mon } = formatDay(event.starts_at);
  const kind = eventBrief(event.title, event.location).kind;
  return (
    <Link
      href={eventPath(event.id)}
      style={{ animation: `rowIn 220ms cubic-bezier(0.23,1,0.32,1) ${delayMs}ms both` }}
      className="btn-press flex w-[168px] shrink-0 snap-start flex-col gap-2 px-1 py-1"
    >
      <div className="flex h-8 w-8 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md bg-ink/[0.06] text-ink2">
        <span className="text-[11px] font-bold leading-none">{num}</span>
        <span className="text-[9px] font-semibold leading-none">{mon}</span>
      </div>
      <div className="min-w-0">
        <p className="truncate font-mono text-[0.625rem] font-medium uppercase tracking-[0.06em] text-accent">
          {kind}
        </p>
        <p className="truncate text-fl-sm font-semibold text-ink">{event.title}</p>
        <p className="truncate text-fl-xs text-ink3">{event.guest_count ?? 0} guests</p>
      </div>
    </Link>
  );
}

function PastEventsStrip({ events }: { events: EventT[] }) {
  return (
    <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-1">
      {events.map((e, i) => (
        <PastEventCard key={e.id} event={e} delayMs={i * 25} />
      ))}
    </div>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-fl-sm text-ink3">{children}</p>;
}

function HomeFallback({
  events,
  catchUp,
}: {
  events: EventT[];
  catchUp: InboxPersonT[];
}) {
  const topEvents = events.slice(0, 5);
  const topCatchUp = catchUp.slice(0, 4);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto pb-8">
      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-fl-lg font-bold tracking-[-0.03em] text-ink">Events</h2>
          <Link href={APP_EVENTS} className="text-fl-xs font-semibold text-accent hover:underline">
            All events
          </Link>
        </div>
        <p className="mt-1 text-fl-sm text-ink3">Pick a synced room to browse guests.</p>
        <ul className="mt-3">
          {topEvents.map((event) => (
            <li key={event.id}>
              <Link
                href={eventPath(event.id)}
                className="btn-press flex items-center justify-between gap-3 border-b border-ink/[0.06] py-3"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">{event.title}</span>
                  <span className="mt-0.5 block text-fl-xs text-ink3">
                    {event.guest_count ?? 0} guests
                    {event.location ? ` · ${event.location}` : ""}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {topCatchUp.length > 0 ? (
        <section>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-fl-lg font-bold tracking-[-0.03em] text-ink">
              Catch up
            </h2>
            <Link href={APP_INBOX} className="text-fl-xs font-semibold text-accent hover:underline">
              Inbox
            </Link>
          </div>
          <p className="mt-1 text-fl-sm text-ink3">People you kept — pick a next move.</p>
          <ul className="mt-3">
            {topCatchUp.map((person) => {
              const name = [person.first_name, person.last_name].filter(Boolean).join(" ");
              return (
                <li key={person.id}>
                  <Link
                    href={personPath(person.id, { from: "home" })}
                    className="btn-press flex flex-col gap-0.5 border-b border-ink/[0.06] py-3"
                  >
                    <span className="font-semibold text-ink">{name}</span>
                    <span className="truncate text-fl-xs text-ink3">
                      {person.role || person.event_title || "Kept"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** Distinct event brief — kind + where; approach tips live on each person. */
function EventStrip({
  title,
  location,
  featuredMeta,
  toReview,
  inbox,
}: {
  title: string;
  location?: string | null;
  featuredMeta?: string;
  toReview: number;
  inbox: number;
}) {
  const brief = eventBrief(title, location);
  const where = location?.trim() || null;

  return (
    <header className="min-w-0 rounded-md border border-ink/10 bg-surface-raised px-4 py-3 shadow-sm md:py-3.5">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="rounded-md bg-accent px-2 py-0.5 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.06em] text-white">
              {brief.kind}
            </span>
            <p className="min-w-0 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink3">
              {featuredMeta ?? "Upcoming"}
              <span className="mx-1.5 text-accent/50" aria-hidden="true">
                ·
              </span>
              <span className="tabular text-ink">{toReview}</span>
              <span className="ml-1 normal-case tracking-normal text-ink3">left</span>
              <span className="mx-1.5 hidden text-ink3/40 md:inline" aria-hidden="true">
                ·
              </span>
              <span className="hidden tabular text-ink md:inline">{inbox}</span>
              <span className="ml-1 hidden normal-case tracking-normal text-ink3 md:inline">inbox</span>
            </p>
          </div>
          <h1 className="mt-1.5 truncate font-display text-[1.125rem] font-bold leading-[1.05] tracking-[-0.04em] text-ink sm:text-[1.25rem] md:mt-1.5 md:text-[1.375rem] md:text-balance md:whitespace-normal">
            {title}
          </h1>
          {where ? (
            <p className="mt-1 truncate text-[0.8125rem] font-medium text-ink2">{where}</p>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default function Home({ data }: { data: HomeDataT }) {
  const featured = data.featuredEvent
    ? data.events.find((e) => e.id === data.featuredEvent!.id) ??
      data.upcoming.find((e) => e.id === data.featuredEvent!.id)
    : undefined;
  const featuredMeta = featured ? featuredStatusLabel(featured) : undefined;
  const showFallback =
    !data.featuredEvent && (data.events.length > 0 || data.catchUp.length > 0);

  return (
    <main className="home-stage phone-focus-shell flex w-full min-w-0 max-w-[100vw] flex-col overflow-hidden md:min-h-0 md:max-w-none md:flex-1 md:overflow-y-auto md:overscroll-y-contain">
      <div className="mx-auto flex h-full min-h-0 w-full min-w-0 max-w-[1240px] flex-1 flex-col px-4 pt-2 md:h-auto md:min-h-0 md:justify-start md:px-8 md:pt-4 md:pb-8 lg:px-10">
        {data.featuredEvent ? (
          <div className="shrink-0">
            <EventStrip
              title={data.featuredEvent.title}
              location={data.featuredEvent.location ?? featured?.location}
              featuredMeta={featuredMeta}
              toReview={data.reviewQueue.length}
              inbox={data.inboxCount}
            />
          </div>
        ) : (
          <header className="flex shrink-0 flex-wrap items-end justify-between gap-3">
            <h1 className="font-display text-fl-xl font-bold tracking-[-0.04em] text-ink">
              {showFallback ? "Where to next" : "Good to see you."}
            </h1>
          </header>
        )}

        <div className="mt-2 flex min-h-0 flex-1 flex-col md:mt-3 md:flex-none md:overflow-visible">
          {showFallback ? (
            <HomeFallback events={data.events} catchUp={data.catchUp} />
          ) : data.reviewQueue.length === 0 && !data.featuredEvent ? (
            <EmptyRow>
              No event ready yet. Open Events when a synced room is available.
            </EmptyRow>
          ) : (
            <FollowUpFocus people={data.reviewQueue} focus={data.focus} />
          )}
        </div>

        {data.past.length > 0 && data.featuredEvent ? (
          <div className="mt-12 hidden border-t border-ink/[0.06] pt-6 pb-8 md:block">
            <h2 className="mb-3 text-fl-xs font-medium text-ink3">Past</h2>
            <PastEventsStrip events={data.past} />
          </div>
        ) : null}
      </div>
    </main>
  );
}
