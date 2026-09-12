"use client";

/** Event guest list — Best shortlist; Everyone/Kept/Skipped use pages, not infinite scroll. */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { displayInitials } from "@/lib/displayAvatar";
import { eventBrief } from "@/lib/eventBrief";
import type { AttendeeListItemT, AttendeesDataT } from "@/lib/events";
import { APP_EVENTS, personPath } from "@/lib/routes";
import { guestHeadline } from "@/lib/guestHeadline";

type Mode = "best" | "everyone" | "kept" | "skipped";

const BEST_CAP = 15;
const PAGE_SIZE = 10;
const STAGGER_CAP = 10;
const EASE = [0.23, 1, 0.32, 1] as const;

function matchesQuery(person: AttendeeListItemT, q: string): boolean {
  if (!q) return true;
  const hay = [person.name, person.role, person.why, person.linkedin_url ?? "", person.x_url ?? ""]
    .join(" ")
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => hay.includes(token));
}

function byMatchScore(a: AttendeeListItemT, b: AttendeeListItemT): number {
  const sa = a.score ?? -1;
  const sb = b.score ?? -1;
  if (sb !== sa) return sb - sa;
  return a.name.localeCompare(b.name);
}

function pickBestMatches(ranked: AttendeeListItemT[]): AttendeeListItemT[] {
  const priorityPool = ranked.filter(
    (p) => p.priority === "needs_you" || p.priority === "high",
  );
  const pool =
    priorityPool.length > 0 && priorityPool.length <= BEST_CAP * 2
      ? priorityPool
      : ranked;
  return pool.slice(0, BEST_CAP);
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-ink/15"
      />
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

function Row({
  person,
  rank,
  mode,
  index,
  reduceMotion,
  eventId,
}: {
  person: AttendeeListItemT;
  rank: number;
  mode: Mode;
  index: number;
  reduceMotion: boolean;
  eventId: string | null;
}) {
  const kept = person.triage_state === "kept";
  const skipped = person.triage_state === "skipped";
  const bestMode = mode === "best";
  const showWhy = bestMode && !!person.why?.trim();
  const href = eventId
    ? personPath(person.id, { from: "events", eventId })
    : personPath(person.id);

  const headline = guestHeadline(person.role);

  const delay = reduceMotion || index >= STAGGER_CAP ? 0 : index * 0.025;

  return (
    <motion.li
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay, ease: EASE }}
    >
      <Link
        href={href}
        className="btn-press flex items-start gap-3 rounded-md border border-ink/10 bg-surface-raised px-3 py-3.5 shadow-sm transition-colors hover:border-ink/20"
      >
        {bestMode ? (
          <span className="w-7 shrink-0 pt-1.5 text-center font-mono text-[0.75rem] font-semibold tabular text-accent">
            {rank}
          </span>
        ) : (
          <span className="w-7 shrink-0 pt-1.5 text-center font-mono text-[0.6875rem] tabular text-ink3">
            {rank}
          </span>
        )}
        <Avatar name={person.name} url={person.avatar_url} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-display text-[1.125rem] font-bold leading-tight tracking-[-0.035em] text-ink">
              {person.name}
            </span>
            {kept ? (
              <span className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.06em] text-accent">
                Kept
              </span>
            ) : null}
            {skipped ? (
              <span className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.06em] text-ink3">
                Skipped
              </span>
            ) : null}
          </span>

          {headline ? (
            <span className="mt-1.5 line-clamp-2 block text-[0.9375rem] font-semibold leading-snug tracking-[-0.015em] text-ink">
              {headline}
            </span>
          ) : (
            <span className="mt-1.5 block text-[0.8125rem] font-medium text-ink3">
              Role not on Luma
            </span>
          )}

          {showWhy ? (
            <span className="mt-2.5 block border-t border-ink/[0.06] pt-2.5">
              <span className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-ink3">
                Why meet
              </span>
              <span className="mt-0.5 line-clamp-2 block text-[0.8125rem] leading-snug text-ink2">
                {person.why}
              </span>
            </span>
          ) : null}
        </span>
        <span aria-hidden="true" className="shrink-0 self-center text-fl-base font-semibold text-ink3">
          →
        </span>
      </Link>
    </motion.li>
  );
}

function ModeChip({
  active,
  label,
  count,
  onClick,
  accent,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "btn-press inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-[0.8125rem] font-semibold transition-colors duration-150",
        active && accent
          ? "bg-accent text-white shadow-sm"
          : active
            ? "bg-ink text-white"
            : "bg-ink/[0.06] text-ink2 hover:bg-ink/[0.1] hover:text-ink",
      ].join(" ")}
    >
      {label}
      <span
        className={[
          "font-mono text-[0.6875rem] tabular",
          active ? "text-white/75" : "text-ink3",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}

function PageNav({
  page,
  pageCount,
  onPrev,
  onNext,
}: {
  page: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav
      aria-label="Guest pages"
      className="mt-5 flex items-center justify-between gap-3 border-t border-ink/10 pt-4"
    >
      <button
        type="button"
        onClick={onPrev}
        disabled={page <= 1}
        className="btn-press inline-flex min-h-11 min-w-[5.5rem] items-center justify-center rounded-md border border-ink/15 bg-surface-raised px-3 text-fl-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        ← Prev
      </button>
      <p className="font-mono text-[0.75rem] font-medium tabular text-ink2">
        <span className="text-ink">{page}</span>
        <span className="mx-1 text-ink3">/</span>
        <span>{pageCount}</span>
      </p>
      <button
        type="button"
        onClick={onNext}
        disabled={page >= pageCount}
        className="btn-press inline-flex min-h-11 min-w-[5.5rem] items-center justify-center rounded-md border border-ink/15 bg-surface-raised px-3 text-fl-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next →
      </button>
    </nav>
  );
}

export default function AttendeesList({ data }: { data: AttendeesDataT }) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("best");
  const [page, setPage] = useState(1);
  const reduceMotion = useReducedMotion() ?? false;

  const ranked = useMemo(() => [...data.attendees].sort(byMatchScore), [data.attendees]);
  const best = useMemo(() => pickBestMatches(ranked), [ranked]);

  const counts = useMemo(() => {
    let kept = 0;
    let skipped = 0;
    for (const p of ranked) {
      if (p.triage_state === "kept") kept += 1;
      else if (p.triage_state === "skipped") skipped += 1;
    }
    return { best: best.length, everyone: ranked.length, kept, skipped };
  }, [ranked, best]);

  const filtered = useMemo(() => {
    let pool: AttendeeListItemT[];
    if (mode === "best") pool = best;
    else if (mode === "kept") pool = ranked.filter((p) => p.triage_state === "kept");
    else if (mode === "skipped") pool = ranked.filter((p) => p.triage_state === "skipped");
    else pool = ranked;
    return pool.filter((p) => matchesQuery(p, query.trim()));
  }, [mode, best, ranked, query]);

  const paginated = mode !== "best";
  const pageCount = paginated ? Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)) : 1;

  useEffect(() => {
    setPage(1);
  }, [mode, query]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const visible = useMemo(() => {
    if (!paginated) return filtered;
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, paginated, page]);

  const rankOffset = paginated ? (page - 1) * PAGE_SIZE : 0;

  function goPage(next: number) {
    setPage(next);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    }
  }

  if (!data.event) {
    return (
      <main className="home-stage min-h-full w-full min-w-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1240px] px-4 py-8 md:px-8 lg:px-10">
          <Link
            href={APP_EVENTS}
            className="btn-press inline-flex min-h-11 items-center text-fl-sm font-semibold text-accent hover:underline"
          >
            ← Events
          </Link>
          <h1 className="mt-4 font-display text-fl-xl font-bold tracking-[-0.04em] text-ink">
            Guests
          </h1>
          <p className="mt-3 max-w-xl text-fl-sm text-ink3">
            This event isn’t synced yet — or the link is stale. Pick a room from Events.
          </p>
        </div>
      </main>
    );
  }

  const brief = eventBrief(data.event.title, data.event.location);
  const modeHint =
    mode === "best"
      ? "Focus shortlist — strongest matches first"
      : mode === "everyone"
        ? paginated
          ? `${PAGE_SIZE} per page — search or step through`
          : "Full room — search anyone"
        : mode === "kept"
          ? "People you kept"
          : "People you skipped";

  return (
    <main className="home-stage min-h-full w-full min-w-0 overflow-y-auto overscroll-y-contain">
      <div className="mx-auto w-full max-w-[1240px] px-4 pb-10 pt-3 md:px-8 md:pt-5 lg:px-10">
      <Link
        href={APP_EVENTS}
        className="btn-press inline-flex min-h-11 items-center text-fl-sm font-semibold text-accent hover:underline"
      >
        ← Events
      </Link>

      <header className="mt-2 min-w-0 rounded-md border border-ink/10 bg-surface-raised px-4 py-3.5 shadow-sm md:px-5 md:py-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="rounded-md bg-accent px-2 py-0.5 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.06em] text-white">
            {brief.kind}
          </span>
          <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink3">
            <span className="tabular text-ink">{data.attendees.length}</span>
            <span className="ml-1 normal-case tracking-normal">in the room</span>
          </p>
        </div>
        <h1 className="mt-1.5 truncate font-display text-[1.25rem] font-bold leading-[1.05] tracking-[-0.04em] text-ink md:text-[1.75rem]">
          {data.event.title}
        </h1>
        {data.event.location ? (
          <p className="mt-1 truncate text-[0.8125rem] font-medium text-ink2 md:text-[0.9375rem]">
            {data.event.location}
          </p>
        ) : null}
      </header>

      <div className="sticky top-0 z-10 -mx-4 mt-4 border-b border-ink/[0.06] bg-ground/95 px-4 py-3 backdrop-blur-md md:-mx-8 md:px-8 lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Guest view">
          <ModeChip
            active={mode === "best"}
            label="Best"
            count={counts.best}
            accent
            onClick={() => setMode("best")}
          />
          <ModeChip
            active={mode === "everyone"}
            label="Everyone"
            count={counts.everyone}
            onClick={() => setMode("everyone")}
          />
          <ModeChip
            active={mode === "kept"}
            label="Kept"
            count={counts.kept}
            onClick={() => setMode("kept")}
          />
          <ModeChip
            active={mode === "skipped"}
            label="Skipped"
            count={counts.skipped}
            onClick={() => setMode("skipped")}
          />
        </div>

        <label className="sr-only" htmlFor="attendee-search">
          Search attendees
        </label>
        <input
          id="attendee-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            mode === "best" ? "Filter best matches…" : "Search name, role, company…"
          }
          autoComplete="off"
          className="field mt-3 w-full max-w-2xl rounded-md border border-rule bg-surface-raised px-3.5 py-3 text-fl-base text-ink transition-shadow placeholder:text-ink3 focus:border-ink/25 focus:shadow-sm"
        />
        <p className="mt-2 text-fl-xs text-ink3">
          <span className="font-mono tabular text-ink2">{filtered.length}</span>
          {query.trim() ? " matching" : ""} · {modeHint}
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 text-fl-sm text-ink3">
          {query.trim()
            ? `No one matches “${query.trim()}”. Try another name or company.`
            : mode === "best"
              ? "No strong matches yet — open Everyone or sync again."
              : "No guests in this view."}
        </p>
      ) : (
        <>
          <AnimatePresence initial={false}>
            <motion.ul
              key={`${mode}-${page}-${query}`}
              className={[
                "mt-4 grid grid-cols-1 gap-2.5",
                mode === "best" ? "md:grid-cols-2 md:gap-3" : "md:grid-cols-2 lg:grid-cols-3 md:gap-3",
              ].join(" ")}
              initial={reduceMotion ? false : { opacity: 0.72 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.14, ease: EASE }}
            >
              {visible.map((person, i) => (
                <Row
                  key={person.id}
                  person={person}
                  rank={rankOffset + i + 1}
                  mode={mode}
                  index={i}
                  reduceMotion={reduceMotion}
                  eventId={data.event?.id ?? null}
                />
              ))}
            </motion.ul>
          </AnimatePresence>
          {paginated ? (
            <PageNav
              page={page}
              pageCount={pageCount}
              onPrev={() => goPage(Math.max(1, page - 1))}
              onNext={() => goPage(Math.min(pageCount, page + 1))}
            />
          ) : null}
        </>
      )}
      </div>
    </main>
  );
}
