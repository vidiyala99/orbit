"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { attendeeName } from "@/lib/demoFixtures";
import { dm_payload, note_payload, writeClipboard } from "@/lib/contactCopy";
import { displayAvatarUrl } from "@/lib/displayAvatar";
import type { AttendeePriorityT, AttendeeT, EventBriefT } from "@/lib/types";
import { AttendeeSocials, ChevronLeftIcon } from "./SocialIcons";
import { ContactNoteCard } from "./ContactNote";

/** Matches the md: breakpoint used throughout this file's Tailwind classes. */
const DESKTOP_QUERY = "(min-width: 768px)";

const SEGMENTS: { id: AttendeePriorityT; label: string }[] = [
  { id: "needs_you", label: "Needs you" },
  { id: "high", label: "High" },
  { id: "later", label: "Later" },
];

const SEGMENT_INDEX: Record<AttendeePriorityT, number> = {
  needs_you: 0,
  high: 1,
  later: 2,
};

function Avatar({ row, size = 48 }: { row: AttendeeT; size?: number }) {
  const src = row.avatar_url ?? displayAvatarUrl(row.id, size * 2);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full object-cover"
    />
  );
}

function RowCopyButton({
  label,
  text,
  variant,
}: {
  label: string;
  text: string;
  variant: "primary" | "secondary";
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await writeClipboard(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  const look =
    variant === "primary"
      ? "bg-accent text-white"
      : "border border-ink bg-surface text-ink";

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={label}
      className={`btn-press relative z-10 h-9 flex-1 rounded-full px-3 text-fl-xs font-bold transition-transform ${look}`}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

function NeedsYouActions({ row }: { row: AttendeeT }) {
  return (
    <div className="relative z-10 mt-3 flex items-center gap-2">
      <RowCopyButton label="Copy note" text={note_payload(row)} variant="primary" />
      <RowCopyButton label="Copy DM" text={dm_payload(row)} variant="secondary" />
    </div>
  );
}

/** Real media-query state, not a CSS-only hide: on the desktop split view the
 *  detail pane must not exist in the DOM at all below md, or its "Copy note" /
 *  name text collides with the always-full-width list's own copies of both. */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

function DeskRow({
  row,
  rank,
  selected,
  onSelect,
  compact,
  delayMs = 0,
}: {
  row: AttendeeT;
  rank: number;
  selected: boolean;
  onSelect: (id: string) => void;
  /** True only when a detail pane is actually on screen next to this row
   *  (the real desktop split view) — the row then leaves icons, the why-meet
   *  line, and the copy actions to the pane instead of re-cramming them into
   *  a fixed 400px column. False everywhere else (mobile, and the default
   *  test render), where the row is the only surface and needs everything. */
  compact: boolean;
  /** Staggers the row's entrance when a new segment (Needs you/High/Later)
   *  swaps the whole list in - capped at 6 rows so a long list doesn't keep
   *  visibly filling in. */
  delayMs?: number;
}) {
  const name = attendeeName(row);
  const needsYou = row.priority === "needs_you";

  function onRowClick(e: React.MouseEvent) {
    if (typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches) {
      e.preventDefault();
      onSelect(row.id);
    }
  }

  return (
    <li
      style={{ animation: `rowIn 220ms cubic-bezier(0.23,1,0.32,1) ${delayMs}ms both` }}
      className="relative"
    >
      <Link
        href={`/attendees/${row.id}`}
        className="absolute inset-0 z-0 rounded-card"
        aria-label={name}
        aria-current={selected ? "true" : undefined}
        onClick={onRowClick}
      />
      <div
        className={`lift rounded-card bg-surface p-3.5 shadow-card transition-shadow duration-150 ${
          selected ? "ring-2 ring-accent ring-offset-2 ring-offset-ground" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <Avatar row={row} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-fl-base font-bold leading-tight text-ink">{name}</p>
              <p className="tabular shrink-0 text-fl-xs font-semibold leading-none text-ink3">#{rank}</p>
            </div>
            <p className="mt-0.5 truncate text-fl-sm font-medium leading-snug text-ink2">{row.role}</p>
          </div>
          {compact ? null : (
            <AttendeeSocials
              name={name}
              linkedinUrl={row.linkedin_url}
              xUrl={row.x_url}
              showLinkedIn={row.linkedin_connected}
              showX={row.x_interacted}
              dense
            />
          )}
        </div>
        {compact ? null : (
          <>
            <p
              title={row.why_meet}
              className="mt-3 truncate rounded-full bg-ground px-2.5 py-1 font-mono text-fl-xs italic leading-snug text-ink2"
            >
              {row.why_meet}
            </p>
            {needsYou ? <NeedsYouActions row={row} /> : null}
          </>
        )}
      </div>
    </li>
  );
}

export default function AttendeeBrief({
  event,
  attendees,
  backHref = "/",
}: {
  event: EventBriefT;
  attendees: AttendeeT[];
  backHref?: string;
}) {
  const [segment, setSegment] = useState<AttendeePriorityT>("needs_you");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isDesktop = useIsDesktop();
  const count = attendees.length;
  const rows = attendees.filter((row) => row.priority === segment);
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0] ?? null;

  // Keep a detail pane populated whenever the desktop split view has rows to show.
  useEffect(() => {
    if (!rows.some((row) => row.id === selectedId)) {
      setSelectedId(rows[0]?.id ?? null);
    }
    // Only re-run when the segment (and therefore the row set) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment, rows.length]);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[1400px] bg-ground px-4 pb-16 pt-5 md:px-8">
      <header className="flex items-center gap-3 pb-4">
        <Link
          href={backHref}
          aria-label="Back"
          className="btn-press -ml-1 flex h-11 w-11 shrink-0 items-center justify-center text-ink"
        >
          <ChevronLeftIcon />
        </Link>
        <h1 className="text-fl-xl font-extrabold leading-tight tracking-[-0.3px] text-ink">
          {event.title}
        </h1>
        <p className="text-fl-sm font-medium text-ink2">
          {event.datetime} · {count} {count === 1 ? "guest" : "guests"}
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Priority"
        className="relative mb-4 grid grid-cols-3 overflow-hidden rounded-[10px] border border-rule bg-surface"
      >
        <span
          aria-hidden="true"
          className="segment-indicator absolute inset-y-0 left-0 w-1/3 bg-accent-soft transition-transform duration-200 ease-out"
          style={{ transform: `translateX(${SEGMENT_INDEX[segment] * 100}%)` }}
        />
        {SEGMENTS.map((item) => {
          const selected = segment === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setSegment(item.id)}
              className={`btn-press relative z-10 flex h-10 items-center justify-center gap-1.5 text-fl-sm transition-colors duration-150 ${
                selected ? "font-bold text-ink" : "font-medium text-ink3"
              }`}
            >
              {item.label}
              {selected ? (
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div data-testid="priority-desk" className="md:w-[360px] md:shrink-0">
          {rows.length === 0 ? (
            <p className="rounded-card bg-surface px-4 py-4 text-fl-sm font-medium text-ink3 shadow-card">
              No one in this list.
            </p>
          ) : (
            <ul className="flex max-h-[600px] flex-col gap-3 overflow-y-auto p-1">
              {rows.map((row, i) => (
                <DeskRow
                  key={row.id}
                  row={row}
                  compact={isDesktop}
                  rank={i + 1}
                  delayMs={Math.min(i, 6) * 30}
                  selected={selected?.id === row.id}
                  onSelect={setSelectedId}
                />
              ))}
            </ul>
          )}
        </div>

        {isDesktop && selected ? (
          <div key={selected.id} className="min-w-0 flex-1">
            <ContactNoteCard attendee={selected} />
          </div>
        ) : null}
      </div>
    </main>
  );
}
