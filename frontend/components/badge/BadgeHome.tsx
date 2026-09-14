"use client";

import { AnimatePresence, MotionConfig, motion, useIsPresent } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { triagePerson } from "@/lib/api";
import { ensureClientToken } from "@/lib/auth";
import { formatEventTime, fullName, type BadgeEvent, type BadgePerson, type TriageState } from "@/lib/badge";
import { APP_EVENTS, APP_HOME, eventPath } from "@/lib/routes";
import BadgeCard, { SocialButtons } from "./BadgeCard";
import BadgeTabs from "./BadgeTabs";
import { counterVariants, deckVariants, type MotionIntent } from "./badgeMotion";
import { useBadgeQueue, type Decisions } from "./useBadgeQueue";
import { useMediaQuery } from "./useMediaQuery";

type ToastInput =
  | { kind: "decision"; id: string; name: string; state: TriageState }
  | { kind: "error"; message: string };
/** `seq` keys each toast so a new one re-enters and restarts its Undo timer. */
type Toast = ToastInput & { seq: number };

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

/**
 * One badge in the deck. While it animates out it is `inert`: hidden from assistive tech and input,
 * and it releases focus. (Not aria-hidden: browsers refuse that while the swiped card still holds focus.)
 */
function DeckItem({ intent, settle, children }: { intent: MotionIntent; settle: boolean; children: ReactNode }) {
  const isPresent = useIsPresent();
  return (
    <motion.div
      className="bw-deck-item"
      custom={intent}
      variants={deckVariants}
      initial="enter"
      animate="center"
      exit="exit"
      data-present={isPresent}
      inert={!isPresent}
    >
      <div className={`bw-deck-body ${settle ? "bw-settle" : ""}`}>{children}</div>
    </motion.div>
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
  // Tracked per person, so the next badge never arrives already flipped.
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [toastPaused, setToastPaused] = useState(false);
  const [timeLabel, setTimeLabel] = useState(eventTimeLabel ?? "");
  const [motionState, setMotionState] = useState<Omit<MotionIntent, "wide">>({ kind: "load", dir: 1 });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastSeq = useRef(0);
  const toastDeadline = useRef(0);
  const toastRemaining = useRef(TOAST_MS);
  const dockRef = useRef<HTMLDivElement>(null);
  const [toastBottom, setToastBottom] = useState<number | null>(null);

  const person = people[queue.index] ?? null;
  const decided = person ? queue.decisions[person.id] : undefined;
  const done = people.length > 0 && queue.remaining === 0;
  const flipped = !wide && person !== null && flippedId === person.id;
  const intent: MotionIntent = { ...motionState, wide };

  useEffect(() => {
    if (!eventTimeLabel) setTimeLabel(formatEventTime(event?.startsAt ?? null));
  }, [event?.startsAt, eventTimeLabel]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  // Phones and tablets: float the toast just above the dock so it never covers Skip/Keep for the next person.
  const hasDock = Boolean(person) && !done;
  useEffect(() => {
    const dock = dockRef.current;
    if (wide || !hasDock || !dock || typeof ResizeObserver === "undefined") {
      setToastBottom(null);
      return;
    }
    const update = () => setToastBottom(Math.max(0, window.innerHeight - dock.getBoundingClientRect().top) + 10);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(dock);
    window.addEventListener("resize", update);
    // Capture phase also catches the page column scrolling on short phones.
    window.addEventListener("scroll", update, { capture: true, passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, { capture: true });
    };
  }, [wide, hasDock]);

  function startToastTimer(ms: number) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastDeadline.current = Date.now() + ms;
    toastRemaining.current = ms;
    toastTimer.current = setTimeout(() => {
      toastTimer.current = null;
      setToast(null);
    }, ms);
  }

  function showToast(next: ToastInput) {
    toastSeq.current += 1;
    setToast({ ...next, seq: toastSeq.current });
    setToastPaused(false);
    startToastTimer(TOAST_MS);
  }

  /** The Undo window holds while a pointer or keyboard focus is on the toast (WCAG 2.2.1). */
  function pauseToast() {
    if (!toastTimer.current) return;
    clearTimeout(toastTimer.current);
    toastTimer.current = null;
    toastRemaining.current = Math.max(0, toastDeadline.current - Date.now());
    setToastPaused(true);
  }

  function resumeToast() {
    if (toastTimer.current || !toast) return;
    setToastPaused(false);
    startToastTimer(toastRemaining.current);
  }

  function toggleFlip() {
    if (!person) return;
    const id = person.id;
    setFlippedId((current) => (current === id ? null : id));
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

  function browse(dir: 1 | -1, viaKeyboard = false) {
    setMotionState({ kind: viaKeyboard ? "key" : "browse", dir });
    queue.go(dir);
  }

  function decide(state: TriageState, viaKeyboard = false) {
    if (!person) return;
    setMotionState({ kind: viaKeyboard ? "key" : state, dir: state === "kept" ? 1 : -1 });
    queue.decide(person.id, state);
    showToast({ kind: "decision", id: person.id, name: person.firstName || fullName(person), state });
    void persist(person.id, state);
  }

  function undo(id: string, state: TriageState) {
    setMotionState({ kind: "undo", dir: state === "kept" ? 1 : -1 });
    queue.undo(id);
    setToast(null);
    void persist(id, null);
  }

  const keyHandler = useRef<(event: KeyboardEvent) => void>(() => {});
  keyHandler.current = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "ArrowRight") browse(1, true);
    else if (e.key === "ArrowLeft") browse(-1, true);
    else if (e.key === "k" || e.key === "K") decide("kept", true);
    else if (e.key === "s" || e.key === "S") decide("skipped", true);
    else if (e.key === " " && !wide && !target?.closest("a, button")) {
      e.preventDefault();
      toggleFlip();
    }
  };

  useEffect(() => {
    const listener = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
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
                    <ChevronButton direction={-1} disabled={people.length <= 1} onClick={() => browse(-1)} />
                    <span className="bw-counter-box">
                      <span className="bw-counter-num">
                        <AnimatePresence initial={false} custom={intent}>
                          <motion.span
                            key={queue.index}
                            custom={intent}
                            variants={counterVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                          >
                            {queue.index + 1}
                          </motion.span>
                        </AnimatePresence>
                      </span>{" "}
                      <span className="bw-counter-of">of</span> {people.length}
                    </span>
                    <ChevronButton direction={1} disabled={people.length <= 1} onClick={() => browse(1)} />
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
                    <div className="bw-deck">
                      <AnimatePresence initial={false} custom={intent}>
                        <DeckItem key={person.id} intent={intent} settle={motionState.kind === "load"}>
                          <BadgeCard
                            person={person}
                            intent={intent}
                            flipped={flipped}
                            wide={wide}
                            onFlip={toggleFlip}
                            onSwipe={(direction) => browse(direction)}
                          />
                        </DeckItem>
                      </AnimatePresence>
                    </div>
                    <div className="bw-dock" ref={dockRef}>
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

          <div
            className="bw-toast-region"
            aria-live="polite"
            style={toastBottom !== null ? { bottom: toastBottom } : undefined}
          >
            <AnimatePresence>
              {toast ? (
                <motion.div
                  key={toast.seq}
                  className="bw-toast"
                  data-paused={toastPaused}
                  onPointerEnter={pauseToast}
                  onPointerLeave={resumeToast}
                  onFocus={pauseToast}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) resumeToast();
                  }}
                  initial={{ opacity: 0, y: 14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", duration: 0.35, bounce: 0 } }}
                  exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
                >
                  {toast.kind === "error" ? (
                    <span>{toast.message}</span>
                  ) : (
                    <>
                      <span>
                        {toast.state === "kept" ? `Kept ${toast.name}. Added to Inbox.` : `Skipped ${toast.name}.`}
                      </span>
                      <button type="button" className="bw-toast-undo" onClick={() => undo(toast.id, toast.state)}>
                        Undo
                      </button>
                      {/* The Undo window, running out. */}
                      <span aria-hidden="true" className="bw-toast-timer" style={{ animationDuration: `${TOAST_MS}ms` }} />
                    </>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="bw-tabbar-wrap">
            <BadgeTabs variant="bottom" activeOverride={APP_HOME} />
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
