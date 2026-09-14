"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { triagePerson } from "@/lib/api";
import { ensureClientToken } from "@/lib/auth";
import { formatEventTime, fullName, type BadgeEvent, type BadgePerson, type TriageState } from "@/lib/badge";
import { APP_EVENTS, APP_HOME, eventPath } from "@/lib/routes";
import BadgeCard, { SocialButtons } from "./BadgeCard";
import BadgeTabs from "./BadgeTabs";
import { useBadgeQueue, type Decisions } from "./useBadgeQueue";
import { useMediaQuery } from "./useMediaQuery";

type Toast =
  | { kind: "decision"; id: string; name: string; state: TriageState }
  | { kind: "error"; message: string };

const TOAST_MS = 4500;
/** Matches the open-badge-holder breakpoint in badge-world.css. */
const WIDE_QUERY = "(min-width: 900px)";

function ChevronButton({ direction, disabled, onClick }: { direction: -1 | 1; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === -1 ? "Previous person" : "Next person"}
      className="bw-chevron"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4">
        <path
          d={direction === -1 ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function EmptyRoom({ event }: { event: BadgeEvent | null }) {
  return (
    <div className="bw-empty">
      <p className="bw-empty-title">{event ? "Nobody left to review" : "No event to review yet"}</p>
      <p className="bw-empty-text">
        {event
          ? "Everyone ranked for this event has a decision. Browse the full guest list to find anyone else."
          : "Once an event with guests is added, its ranked guests hang here."}
      </p>
      <Link href={event ? eventPath(event.id) : APP_EVENTS} className="bw-empty-link">
        {event ? "Open guest list" : "Go to Events"}
      </Link>
    </div>
  );
}

export default function BadgeHome({
  event,
  people,
  eventTimeLabel,
  initialIndex,
  initialDecisions,
  persistTriage = false,
}: {
  event: BadgeEvent | null;
  people: BadgePerson[];
  /** Fixed label for fixtures; otherwise formatted from startsAt in the viewer's timezone. */
  eventTimeLabel?: string;
  initialIndex?: number;
  initialDecisions?: Decisions;
  persistTriage?: boolean;
}) {
  const ids = useMemo(() => people.map((p) => p.id), [people]);
  const queue = useBadgeQueue(ids, { index: initialIndex, decisions: initialDecisions });
  const wide = useMediaQuery(WIDE_QUERY);
  const [flippedState, setFlipped] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [timeLabel, setTimeLabel] = useState(eventTimeLabel ?? "");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const person = people[queue.index] ?? null;
  const decided = person ? queue.decisions[person.id] : undefined;
  const done = people.length > 0 && queue.remaining === 0;
  const flipped = !wide && flippedState;

  useEffect(() => {
    if (!eventTimeLabel) setTimeLabel(formatEventTime(event?.startsAt ?? null));
  }, [event?.startsAt, eventTimeLabel]);

  useEffect(() => setFlipped(false), [queue.index]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  function showToast(next: Toast) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(next);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }

  async function persist(id: string, state: TriageState | null) {
    if (!persistTriage) return;
    try {
      const token = await ensureClientToken();
      if (!token) throw new Error("no session");
      await triagePerson(id, state, token);
    } catch {
      showToast({ kind: "error", message: "Couldn't save that decision. Check your connection and try again." });
    }
  }

  function decide(state: TriageState) {
    if (!person) return;
    queue.decide(person.id, state);
    showToast({ kind: "decision", id: person.id, name: person.firstName || fullName(person), state });
    void persist(person.id, state);
  }

  function undo(id: string) {
    queue.undo(id);
    setToast(null);
    void persist(id, null);
  }

  const keyHandler = useRef<(event: KeyboardEvent) => void>(() => {});
  keyHandler.current = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "ArrowRight") queue.go(1);
    else if (e.key === "ArrowLeft") queue.go(-1);
    else if (e.key === "k" || e.key === "K") decide("kept");
    else if (e.key === "s" || e.key === "S") decide("skipped");
    else if (e.key === " " && !wide && !target?.closest("a, button")) {
      e.preventDefault();
      setFlipped((f) => !f);
    }
  };

  useEffect(() => {
    const listener = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  return (
    <div className="badge-world bw-page">
      <div className="bw-home">
        <header className="bw-header">
          <div className="bw-header-top">
            <Link href={APP_HOME} className="bw-wordmark">
              Actintro
            </Link>
            <BadgeTabs variant="top" activeOverride={APP_HOME} />
          </div>
          <div className="bw-header-main">
            <h1 className="bw-event-title">{event?.title ?? "Home"}</h1>
            <div className="bw-header-row">
              <p className="bw-event-time">
                {timeLabel ? <time dateTime={event?.startsAt ?? undefined}>{timeLabel}</time> : null}
              </p>
              {people.length ? (
                <div className="bw-counter">
                  <ChevronButton direction={-1} disabled={people.length <= 1} onClick={() => queue.go(-1)} />
                  <span className="bw-counter-box">
                    {queue.index + 1} <span className="bw-counter-of">of</span> {people.length}
                  </span>
                  <ChevronButton direction={1} disabled={people.length <= 1} onClick={() => queue.go(1)} />
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {people.length ? (
          <>
            {/* Position and decision for screen readers; phones show no counter. */}
            <p className="bw-status sr-only" aria-live="polite">
              {person ? `${fullName(person)}, ${queue.index + 1} of ${people.length}${decided ? `, ${decided}` : ""}` : ""}
            </p>
            <main className="bw-main">
              {done ? (
                <EmptyRoom event={event} />
              ) : person ? (
                <>
                  <BadgeCard
                    person={person}
                    flipped={flipped}
                    wide={wide}
                    onFlip={() => setFlipped((f) => !f)}
                    onSwipe={(direction) => queue.go(direction)}
                  />
                  <div className="bw-dock">
                    <SocialButtons person={person} className="bw-socials-main" />
                    <div className="bw-actions">
                      <button
                        type="button"
                        onClick={() => decide("skipped")}
                        className="bw-skip"
                        aria-keyshortcuts="S"
                        aria-pressed={decided === "skipped"}
                      >
                        Skip
                        <kbd className="bw-kbd" aria-hidden="true">
                          S
                        </kbd>
                      </button>
                      <button
                        type="button"
                        onClick={() => decide("kept")}
                        className="bw-keep"
                        aria-keyshortcuts="K"
                        aria-pressed={decided === "kept"}
                      >
                        Keep
                        <kbd className="bw-kbd" aria-hidden="true">
                          K
                        </kbd>
                      </button>
                    </div>
                    <p className="bw-hint">Use the arrow keys to browse.</p>
                  </div>
                </>
              ) : null}
            </main>
          </>
        ) : (
          <main className="bw-main">
            <EmptyRoom event={event} />
          </main>
        )}

        <div className="bw-toast-region" aria-live="polite">
          {toast ? (
            <div className="bw-toast">
              {toast.kind === "error" ? (
                <span>{toast.message}</span>
              ) : (
                <>
                  <span>
                    {toast.state === "kept" ? `Kept ${toast.name}. Added to Inbox.` : `Skipped ${toast.name}.`}
                  </span>
                  <button type="button" className="bw-toast-undo" onClick={() => undo(toast.id)}>
                    Undo
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>

        <div className="bw-tabbar-wrap">
          <BadgeTabs variant="bottom" activeOverride={APP_HOME} />
        </div>
      </div>
    </div>
  );
}
