"use client";

import { useState } from "react";
import Link from "next/link";
import type { EventT, HomeDataT, ShortlistPersonT } from "@/lib/events";
import { displayInitials } from "@/lib/displayAvatar";
import SyncButton from "./SyncButton";
import ConnectLuma from "./ConnectLuma";
import JobTargetEditor from "./JobTargetEditor";
import FollowUpFocus from "./FocusCard";

const BOOST_LABEL: Record<string, string> = {
  hiring: "Hiring power — likely has hiring influence",
  relevant: "Matches your job target",
  connector: "Well-connected — possible warm intro",
};

function formatDay(iso: string): { num: string; mon: string } {
  const d = new Date(iso);
  return {
    num: String(d.getDate()).padStart(2, "0"),
    mon: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
  };
}

/** "starts tomorrow" / "starts in 3 days" / "starts today" — the featured
 *  shortlist section's only clock, so it stays a short phrase, not a date. */
function startsLabel(iso: string): string {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "starts today";
  if (days === 1) return "starts tomorrow";
  return `starts in ${days} days`;
}

function Avatar({
  name,
  avatarUrl,
  size = 32,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.34)) }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-bold tracking-wide text-accent"
    >
      {displayInitials(name)}
    </span>
  );
}

/** One shadow per list group, not per row — every list on the dashboard
 *  (shortlist, follow-up, past events) shares this shell so the page reads
 *  as a handful of grouped lists rather than a stack of separately-shadowed
 *  cards. */
function ListGroup({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-card border border-rule bg-surface shadow-card">{children}</div>;
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-card border border-rule bg-surface px-4 py-4 text-fl-sm text-ink3 shadow-card">
      {children}
    </p>
  );
}

/** A past event as a compact, browsable chip — deliberately not the same
 *  full-width row treatment as the action-oriented ListGroups above it (the
 *  shortlist carousel / needs-follow-up rows), so a glance at the page can
 *  tell "thing to do" from "thing to browse" without reading either
 *  section. Sits in a horizontal-scroll strip (see PastEventsStrip). */
function PastEventCard({ event, delayMs = 0 }: { event: EventT; delayMs?: number }) {
  const { num, mon } = formatDay(event.starts_at);
  return (
    <Link
      href={`/attendees?event=${event.id}`}
      style={{ animation: `rowIn 220ms cubic-bezier(0.23,1,0.32,1) ${delayMs}ms both` }}
      className="lift flex w-[168px] shrink-0 snap-start flex-col gap-2 rounded-card border border-rule bg-surface px-3 py-2.5 hover:border-ink/15"
    >
      <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md bg-accent-soft text-accent">
        <span className="text-[12px] font-bold leading-none">{num}</span>
        <span className="text-[10px] font-bold leading-none">{mon}</span>
      </div>
      <div className="min-w-0">
        <p className="truncate text-fl-sm font-bold text-ink">{event.title}</p>
        <p className="truncate text-fl-xs text-ink3">
          {event.location ?? "Location TBD"} · {event.guest_count ?? 0} guests
        </p>
      </div>
    </Link>
  );
}

/** Horizontal-scroll strip of past-event chips — a browse surface, not a
 *  task list, so it reads distinctly from the ListGroup rows used for the
 *  shortlist/follow-up queue above it. */
function PastEventsStrip({ events }: { events: EventT[] }) {
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
      {events.map((e, i) => (
        <PastEventCard key={e.id} event={e} delayMs={i * 25} />
      ))}
    </div>
  );
}

/** Chevron that flips 180° when the disclosure below it is open. Rotation is
 *  a transform-only transition so the global prefers-reduced-motion block in
 *  globals.css (which collapses all transition-duration to ~0) covers it
 *  without a bespoke media query here. */
function ChevronDownIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.5 6 8 10.5 12.5 6"
      />
    </svg>
  );
}

/** Rank → avatar → name/role → intent chip → score, all on one grid row —
 *  the collapsed height matches the row this replaces exactly. A chevron
 *  button (sibling to the Link, not nested in it) discloses `person.why`
 *  below the row on tap, since a `title` tooltip is invisible on touch. */
function ShortlistRow({ person, rank, delayMs = 0 }: { person: ShortlistPersonT; rank: number; delayMs?: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasWhy = Boolean(person.why && person.why.trim());

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setExpanded((v) => !v);
  }

  return (
    <div
      style={{ animation: `rowIn 220ms cubic-bezier(0.23,1,0.32,1) ${delayMs}ms both` }}
      className="border-t border-rule first:border-t-0"
    >
      <div className="flex">
        <Link
          href={`/attendees/${person.id}`}
          className="grid min-w-0 flex-1 grid-cols-[20px_26px_1fr_auto_auto] items-center gap-2.5 px-3 py-1.5 hover:bg-ground"
        >
          <span className="font-mono text-fl-xs font-bold tabular text-ink3">{String(rank).padStart(2, "0")}</span>
          <Avatar
            name={`${person.first_name} ${person.last_name}`}
            avatarUrl={person.avatar_url}
            size={22}
          />
          <div className="flex min-w-0 items-baseline gap-1.5">
            <span className="truncate text-fl-sm font-bold text-ink">
              {person.first_name} {person.last_name}
            </span>
            <span className="truncate text-fl-xs text-ink3">{person.role}</span>
            {person.boostReason ? (
              <span
                title={BOOST_LABEL[person.boostReason]}
                aria-label={BOOST_LABEL[person.boostReason]}
                className="shrink-0 text-fl-xs font-bold text-accent"
              >
                ↑
              </span>
            ) : null}
          </div>
          {person.intent ? (
            <span className="shrink-0 whitespace-nowrap rounded-md border border-rule bg-ground px-2 py-0.5 text-[11px] font-semibold text-ink2">
              {person.intent}
            </span>
          ) : null}
          {person.score !== null ? (
            <span className="shrink-0 rounded-md bg-accent-soft px-2 py-0.5 font-mono text-fl-xs font-bold tabular text-accent">
              {Math.round(person.score)}
            </span>
          ) : null}
        </Link>
        {hasWhy ? (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={expanded}
            aria-label={`${expanded ? "Hide" : "Show"} why ${person.first_name} ${person.last_name} is on your shortlist`}
            className="btn-press flex w-10 shrink-0 items-center justify-center text-ink3 hover:bg-ground hover:text-accent"
          >
            <ChevronDownIcon expanded={expanded} />
          </button>
        ) : null}
      </div>
      {hasWhy ? (
        <div
          className="grid transition-[grid-template-rows] ease-out"
          style={{
            gridTemplateRows: expanded ? "1fr" : "0fr",
            transitionDuration: "210ms",
            transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)",
          }}
        >
          <div className="overflow-hidden">
            <p className="px-3 pb-2 pl-[58px] text-fl-xs leading-snug text-ink2">{person.why}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SectionHead({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="mb-1.5 mt-3.5 flex items-baseline justify-between gap-2 first:mt-0">
      <h2 className="text-[12px] font-extrabold uppercase tracking-[0.04em] text-ink3">{title}</h2>
      {meta ? <span className="text-fl-xs text-ink3">{meta}</span> : null}
      {action ? (
        <Link href={action.href} className="text-fl-xs font-bold text-accent hover:underline">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

/** Numbers-only, no cards: three counts in one line under the greeting.
 *  Replaces the old three-bordered-card "AT A GLANCE" strip so the numbers
 *  read as context for the page, not a second task competing with the
 *  shortlist carousel for visual weight. */
function GlanceLine({ shortlisted, followUp, synced }: { shortlisted: number; followUp: number; synced: number }) {
  return (
    <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-fl-xs text-ink3">
      <span className="font-bold uppercase tracking-[0.04em] text-ink3">At a glance</span>
      <span aria-hidden="true">·</span>
      <span className="font-mono tabular font-bold text-ink2">{shortlisted}</span>
      <span>shortlisted</span>
      <span aria-hidden="true">·</span>
      <span className="font-mono tabular font-bold text-rust">{followUp}</span>
      <span>to follow up</span>
      <span aria-hidden="true">·</span>
      <span className="font-mono tabular font-bold text-ink2">{synced}</span>
      <span>synced</span>
    </p>
  );
}

export default function Home({ data }: { data: HomeDataT }) {
  const guestsSynced = data.upcoming.reduce((sum, e) => sum + (e.guest_count ?? 0), 0);

  return (
    <main className="pb-appnav mx-auto min-h-dvh w-full max-w-[1440px] bg-ground px-4 pt-8 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div>
          <h1 className="font-display text-fl-xl font-semibold text-ink">Good to see you.</h1>
          <GlanceLine shortlisted={data.shortlistTotal} followUp={data.needsFollowUp.length} synced={guestsSynced} />
        </div>
        {/* Infrequent account controls — deliberately quieter than the
            greeting above them (smaller type, lighter buttons; see
            ConnectLuma/SyncButton) so they read as settings, not as a
            second competing header. */}
        <div className="flex flex-wrap items-center gap-1.5">
          <ConnectLuma lumaConnected={data.lumaConnected} lastSyncedAt={data.lastSyncedAt} />
          <SyncButton lastSyncedAt={data.lastSyncedAt} eventId={data.featuredEvent?.id ?? null} />
        </div>
      </div>

      <div className="mt-2">
        <JobTargetEditor targetRole={data.jobTarget.targetRole} targetIndustries={data.jobTarget.targetIndustries} />
      </div>

      {/* The follow-up queue — full-visual-focus, one person at a time,
          swipe/arrow browsing. A drag-gesture card on touch, the same card
          next to a live queue rail (click/keyboard advance, drag off) on
          desktop — two real surfaces, not one layout reflowing. See
          FocusCard.tsx. This is now the single follow-up surface on Home,
          not a fallback shown only when there's no shortlist. */}
      <div className="mt-4">
        <SectionHead title="Follow up" />
        <FollowUpFocus people={data.needsFollowUp} />
      </div>

      <div className="mt-5">
        <SectionHead
          title={data.featuredEvent ? `Shortlist — ${data.featuredEvent.title}` : "Shortlist"}
          meta={
            data.featuredEvent
              ? startsLabel(data.upcoming.find((e) => e.id === data.featuredEvent!.id)!.starts_at)
              : undefined
          }
        />
        {data.topShortlist.length === 0 ? (
          <EmptyRow>
            {data.featuredEvent
              ? "No shortlist yet for this event."
              : "No upcoming event yet — a shortlist appears once one's on the calendar."}
          </EmptyRow>
        ) : (
          <ListGroup>
            {data.topShortlist.map((p, i) => (
              <ShortlistRow key={p.id} person={p} rank={i + 1} delayMs={i * 25} />
            ))}
          </ListGroup>
        )}
      </div>

      <div className="mt-5 pb-6">
        <SectionHead title="Past events" />
        {data.past.length === 0 ? (
          <EmptyRow>No past events yet — they&apos;ll show up here once one ends.</EmptyRow>
        ) : (
          <PastEventsStrip events={data.past} />
        )}
      </div>
    </main>
  );
}
