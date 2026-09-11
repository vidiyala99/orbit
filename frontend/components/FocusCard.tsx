"use client";

/** The one-person-at-a-time follow-up queue — Orbit's fixed "who should I
 *  follow up with next" mechanic (full visual focus, swipe/arrow browsing).
 *  Two distinct surfaces, not one layout reflowing at a breakpoint: below
 *  768px this is a drag-gesture card (touch idiom — the finger directly
 *  manipulates the card, velocity-based commit, spring return-to-center);
 *  at 768px+ it's the same card next to a live, animated queue rail, with
 *  drag off and click/keyboard (←/→) as the native mouse+keyboard advance
 *  paths instead — dragging a card with a mouse has no equivalent desktop
 *  convention, so it isn't offered as a half-hearted afterthought.
 *
 *  Supersedes `FollowUpStoryDeck` (the old CSS-transition-only deck) and
 *  the old sidebar "Needs follow-up" row list — this is now the single
 *  follow-up surface on Home, mobile and desktop alike, not a fallback
 *  shown only when there's no upcoming-event shortlist.
 *
 *  No AI/agentic scope here: ranking and note/DM text are still the
 *  existing keyword-based `why`/`note_payload`/`dm_payload` fields off the
 *  wire — this component is presentation/interaction only. */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { patchPerson } from "@/lib/api";
import { getClientToken } from "@/lib/auth";
import { dm_payload, note_payload, writeClipboard } from "@/lib/contactCopy";
import { displayInitials } from "@/lib/displayAvatar";
import type { PersonSummaryT } from "@/lib/events";
import type { AttendeeT } from "@/lib/types";

const DESKTOP_QUERY = "(min-width: 768px)";
const SWIPE_DISTANCE = 120;
const SWIPE_VELOCITY = 480;
const CARD_SPRING = { type: "spring", stiffness: 380, damping: 32 } as const;
const SHEET_SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;

const PRIORITY_LABEL: Record<string, string> = {
  needs_you: "Needs you",
  high: "High",
  later: "Later",
};

function initials(person: PersonSummaryT): string {
  const a = person.first_name.trim().charAt(0);
  const b = person.last_name.trim().charAt(0);
  return `${a}${b}`.toUpperCase() || "?";
}

function asContactCopyRow(person: PersonSummaryT): AttendeeT {
  return {
    id: person.id,
    first_name: person.first_name,
    last_name: person.last_name,
    role: person.role,
    linkedin_url: "",
    x_url: "",
    website_url: null,
    why_meet: person.why,
    avatar_url: null,
    priority: person.priority,
    linkedin_connected: false,
    x_interacted: false,
    note: { where_met: "", what_talked: "", why: person.why },
    note_payload: person.note_payload ?? "",
    dm_payload: person.dm_payload ?? "",
    evidence: [],
    talking_points: null,
  };
}
function noteText(person: PersonSummaryT): string {
  return note_payload(asContactCopyRow(person));
}
function dmText(person: PersonSummaryT): string {
  return dm_payload(asContactCopyRow(person));
}

function RailAvatar({ name, size = 26, tone = "accent" }: { name: string; size?: number; tone?: "accent" | "rust" | "amber" }) {
  const bg = tone === "rust" ? "bg-rust-soft text-rust" : tone === "amber" ? "bg-amber-soft text-amber" : "bg-accent-soft text-accent";
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.34)) }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold tracking-wide ${bg}`}
    >
      {displayInitials(name)}
    </span>
  );
}

function CopyButton({ label, text, variant }: { label: string; text: string; variant: "primary" | "secondary" }) {
  const [copied, setCopied] = useState(false);
  async function onCopy() {
    await writeClipboard(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }
  const look = variant === "primary" ? "bg-accent text-white" : "border border-rule bg-surface text-ink";
  return (
    <button
      type="button"
      onClick={onCopy}
      className={`lift btn-press flex-1 rounded-full px-4 py-2 text-fl-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${look}`}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

/** Local queue state + PATCH action. Tracks a purely-local `index` for
 *  browsing and drops a person out of `queue` (advancing the deck) only
 *  once their PATCH actually succeeds — same contract the old
 *  FollowUpStoryDeck had. `jump` additionally lets the desktop rail select
 *  anyone directly, not just step sequentially. */
function useFollowUpQueue(people: PersonSummaryT[]) {
  const [queue, setQueue] = useState(people);
  const [index, setIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = queue.length;
  const current = queue[index] ?? null;

  function go(delta: number) {
    setIndex((i) => Math.max(0, Math.min(total - 1, i + delta)));
  }
  function jump(id: string) {
    const i = queue.findIndex((p) => p.id === id);
    if (i >= 0) setIndex(i);
  }

  async function act(input: { priority?: "later"; followed_up_at?: string }) {
    if (!current || pending) return;
    const token = getClientToken();
    if (!token) {
      setError("You're signed out — refresh and try again.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await patchPerson(current.id, input, token);
      setQueue((q) => {
        const next = q.filter((p) => p.id !== current.id);
        setIndex((i) => Math.min(i, Math.max(0, next.length - 1)));
        return next;
      });
    } catch {
      setError("Couldn't save that — try again.");
    } finally {
      setPending(false);
    }
  }

  return { queue, index, total, current, pending, error, go, jump, act };
}

type QueueState = ReturnType<typeof useFollowUpQueue>;

/** Real media-query state, not a CSS-only reflow — mobile and desktop are
 *  genuinely different component trees (drag-card-alone vs. card+rail with
 *  drag off), so which one mounts has to be a real branch, matching the
 *  `useIsDesktop` convention already used in AttendeeBrief.tsx. */
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

function ExpandHandle({ expanded, onToggle, reduceMotion }: { expanded: boolean; onToggle: (v: boolean) => void; reduceMotion: boolean }) {
  return (
    <motion.button
      type="button"
      onClick={() => onToggle(!expanded)}
      aria-expanded={expanded}
      aria-label={expanded ? "Collapse profile" : "Expand full profile"}
      drag={reduceMotion ? false : "y"}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.6}
      onDragEnd={(_, info: PanInfo) => {
        if (!expanded && info.offset.y < -36) onToggle(true);
        if (expanded && info.offset.y > 36) onToggle(false);
      }}
      whileTap={{ scale: 0.96 }}
      className="btn-press flex w-full flex-col items-center gap-1 border-t border-rule bg-surface py-2 text-ink3 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span aria-hidden="true" className="h-1 w-9 rounded-full bg-rule" />
      <span className="flex items-center gap-1 text-fl-xs font-bold">
        {expanded ? "Collapse" : "See full profile"}
        <motion.svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          aria-hidden="true"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 24 }}
        >
          <path fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" d="M3.5 6 8 10.5 12.5 6" />
        </motion.svg>
      </span>
    </motion.button>
  );
}

/** The card mechanic itself, shared verbatim between mobile and desktop
 *  except `enableDrag` (desktop passes false — see file header). */
function FocusCard({
  queueState,
  enableDrag,
  photoHeight = "min(58vh, 460px)",
}: {
  queueState: QueueState;
  enableDrag: boolean;
  photoHeight?: string;
}) {
  const { queue, index, total, current, pending, error, go, act } = queueState;
  const [expanded, setExpanded] = useState(false);
  const [direction, setDirection] = useState(1);
  const reduceMotion = useReducedMotion() ?? false;
  const dragEnabled = enableDrag && !reduceMotion;

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-10, 10]);
  const dragOpacity = useTransform(x, [-220, -140, 0, 140, 220], [0.4, 1, 1, 1, 0.4]);

  function advance(delta: number) {
    setExpanded(false);
    setDirection(delta);
    go(delta);
  }

  // Desktop keyboard advance — ArrowLeft/ArrowRight, the mouse+keyboard
  // equivalent of the touch drag gesture that mobile uses instead.
  useEffect(() => {
    if (enableDrag) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" && index < total - 1) advance(1);
      if (e.key === "ArrowLeft" && index > 0) advance(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableDrag, index, total]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    const committedLeft = info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY;
    const committedRight = info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY;
    if (committedLeft && index < total - 1) advance(1);
    else if (committedRight && index > 0) advance(-1);
  }

  if (!current) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-1.5 rounded-hero border border-rule bg-surface px-6 text-center shadow-card">
        <p className="font-display text-fl-lg font-bold text-ink">All caught up</p>
        <p className="text-fl-sm text-ink3">Nobody needs a follow-up right now.</p>
      </div>
    );
  }

  const urgent = current.priority === "needs_you";
  const wash = urgent ? "bg-rust-soft" : "bg-amber-soft";

  const cardVariants = {
    enter: (dir: number) => (reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: dir > 0 ? 90 : -90, scale: 0.97 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (dir: number) => (reduceMotion ? { opacity: 0 } : { opacity: 0, x: dir > 0 ? -280 : 280, scale: 0.95 }),
  };

  return (
    <motion.div layout transition={reduceMotion ? { duration: 0 } : SHEET_SPRING} className="overflow-hidden rounded-hero border border-rule bg-surface shadow-glow">
      <div className="px-4 pt-4">
        <div className="flex gap-1">
          {queue.map((p, i) => (
            <div key={p.id} aria-hidden="true" className={`h-1 flex-1 rounded-full transition-colors duration-200 ${i <= index ? "bg-accent" : "bg-rule"}`} />
          ))}
        </div>
        <p className="mt-1.5 tabular text-fl-xs font-semibold text-ink3">
          {index + 1} of {total} to follow up
          {!enableDrag ? <span className="ml-1.5 text-ink3/70">· use ← → or click the queue</span> : null}
        </p>
      </div>

      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.div
          key={current.id}
          custom={direction}
          variants={cardVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={reduceMotion ? { duration: 0 } : CARD_SPRING}
          style={{ x: dragEnabled ? x : 0, rotate: dragEnabled ? rotate : 0, opacity: dragEnabled ? dragOpacity : 1 }}
          drag={dragEnabled && !expanded ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.9}
          dragSnapToOrigin
          onDragEnd={handleDragEnd}
          className={dragEnabled ? "touch-pan-y" : ""}
        >
          <div
            className={`relative mt-3 flex items-center justify-center overflow-hidden ${wash} transition-[height] duration-300 ease-out`}
            style={{ height: expanded ? "min(30vh, 220px)" : photoHeight }}
          >
            <span
              aria-hidden="true"
              className={`flex shrink-0 select-none items-center justify-center rounded-full font-display font-bold text-white ${urgent ? "bg-rust" : "bg-amber"}`}
              style={{
                width: expanded ? "72px" : "clamp(90px, 22vw, 150px)",
                height: expanded ? "72px" : "clamp(90px, 22vw, 150px)",
                fontSize: expanded ? "1.4rem" : "clamp(1.8rem, 6vw, 3rem)",
                transition: "width 300ms ease-out, height 300ms ease-out, font-size 300ms ease-out",
              }}
            >
              {initials(current)}
            </span>
            <span className={`absolute left-3 top-3 inline-flex items-center rounded-full bg-surface/95 px-2.5 py-1 font-mono text-fl-xs font-bold uppercase tracking-[0.03em] shadow-card ${urgent ? "text-rust" : "text-amber"}`}>
              {PRIORITY_LABEL[current.priority] ?? current.priority}
            </span>

            {!expanded && index > 0 ? (
              <motion.button type="button" aria-label="Previous person" onClick={() => advance(-1)} whileTap={{ scale: 0.9 }} className="group absolute inset-y-0 left-0 flex w-1/3 items-center justify-start pl-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface/90 text-ink opacity-80 shadow-card transition-opacity duration-150 group-hover:opacity-100">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </motion.button>
            ) : null}
            {!expanded && index < total - 1 ? (
              <motion.button type="button" aria-label="Next person" onClick={() => advance(1)} whileTap={{ scale: 0.9 }} className="group absolute inset-y-0 right-0 flex w-1/3 items-center justify-end pr-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface/90 text-ink opacity-80 shadow-card transition-opacity duration-150 group-hover:opacity-100">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </motion.button>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5 px-5 pt-4">
            <div>
              <Link href={`/attendees/${current.id}`} className="font-display text-fl-xl font-bold leading-tight tracking-[-0.2px] text-ink hover:underline break-words">
                {current.first_name} {current.last_name}
              </Link>
              <p className="truncate text-fl-base text-ink2">{current.role}</p>
            </div>
            <p className="truncate text-fl-xs text-ink3">{current.event_title} · ended {current.event_ended_days_ago} days ago</p>
            {!expanded && current.why ? (
              <div className="mt-1 rounded-lg bg-accent-soft px-3.5 py-2.5">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.02em] text-accent">Why it matters</h2>
                <p className="mt-0.5 text-fl-sm leading-snug text-ink line-clamp-2">{current.why}</p>
              </div>
            ) : null}
          </div>

          <ExpandHandle expanded={expanded} onToggle={setExpanded} reduceMotion={reduceMotion} />

          <AnimatePresence initial={false}>
            {expanded ? (
              <motion.div
                key="expanded-body"
                initial={reduceMotion ? { opacity: 1 } : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                transition={reduceMotion ? { duration: 0 } : SHEET_SPRING}
                className="overflow-hidden"
              >
                <div className="max-h-[38vh] overflow-y-auto px-5 py-4">
                  <div className="flex flex-col gap-4">
                    {current.why ? (
                      <div>
                        <h3 className="text-[11px] font-bold uppercase tracking-[0.02em] text-accent">Why it matters</h3>
                        <p className="mt-1 text-fl-sm leading-relaxed text-ink">{current.why}</p>
                      </div>
                    ) : null}
                    <div>
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.04em] text-ink3">Event context</h3>
                      <p className="mt-1 text-fl-sm leading-relaxed text-ink2">
                        Met at {current.event_title || "an event"}, which ended {current.event_ended_days_ago} {current.event_ended_days_ago === 1 ? "day" : "days"} ago. Priority: {PRIORITY_LABEL[current.priority] ?? current.priority}.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.04em] text-ink3">Note preview</h3>
                      <p className="mt-1 whitespace-pre-line text-fl-sm leading-relaxed text-ink2">{noteText(current)}</p>
                    </div>
                    <div>
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.04em] text-ink3">DM preview</h3>
                      <p className="mt-1 whitespace-pre-line text-fl-sm leading-relaxed text-ink2">{dmText(current)}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="flex gap-2 px-5 pt-4">
            <CopyButton label="Copy note" text={noteText(current)} variant="primary" />
            <CopyButton label="Copy DM" text={dmText(current)} variant="secondary" />
          </div>

          {error ? <p role="alert" className="px-5 pt-2 text-fl-xs font-semibold text-rust">{error}</p> : null}

          <div className="mt-4 flex gap-2 border-t border-rule px-5 py-3.5">
            <motion.button type="button" disabled={pending} onClick={() => act({ priority: "later" })} whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 400, damping: 20 }} className="min-h-[50px] flex-1 rounded-full border border-rule bg-surface text-fl-base font-bold text-ink disabled:opacity-60">
              Skip
            </motion.button>
            <motion.button type="button" disabled={pending} onClick={() => act({ followed_up_at: new Date().toISOString() })} whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 400, damping: 20 }} className="min-h-[50px] flex-1 rounded-full bg-accent text-fl-base font-bold text-white disabled:opacity-60">
              Follow up
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

/** Rail row background that slides/morphs to the active row via a shared
 *  `layoutId` (the framer-motion "animated tab underline" pattern) — the
 *  active-person highlight glides between rows instead of teleporting. */
function RailRow({ person, active, onSelect, reduceMotion }: { person: PersonSummaryT; active: boolean; onSelect: () => void; reduceMotion: boolean }) {
  const urgent = person.priority === "needs_you";
  return (
    <motion.button
      layout
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      initial={reduceMotion ? false : { opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -14, height: 0 }}
      whileHover={{ x: reduceMotion ? 0 : 2 }}
      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 34 }}
      className="btn-press relative flex w-full items-center gap-2.5 rounded-card px-2.5 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
    >
      {active ? (
        <motion.div
          layoutId="rail-active-highlight"
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 38 }}
          className="absolute inset-0 rounded-card border border-accent/30 bg-accent-soft"
        />
      ) : null}
      <span className="relative z-10 shrink-0">
        <RailAvatar name={`${person.first_name} ${person.last_name}`} size={26} tone={urgent ? "rust" : "amber"} />
      </span>
      <span className="relative z-10 min-w-0 flex-1">
        <span className={`block truncate text-fl-sm font-bold ${active ? "text-ink" : "text-ink2"}`}>{person.first_name} {person.last_name}</span>
        <span className="block truncate text-fl-xs text-ink3">{person.role}</span>
      </span>
      {urgent ? <span aria-hidden="true" className="relative z-10 h-1.5 w-1.5 shrink-0 rounded-full bg-rust" /> : null}
    </motion.button>
  );
}

function QueueRail({ queueState, reduceMotion }: { queueState: QueueState; reduceMotion: boolean }) {
  const { queue, current, jump } = queueState;
  if (queue.length === 0) return null;
  return (
    <section>
      <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.04em] text-ink3">Follow-up queue</p>
      <div className="flex max-h-[52vh] flex-col gap-1 overflow-y-auto rounded-card border border-rule bg-surface p-1.5 shadow-card">
        <AnimatePresence initial={false}>
          {queue.map((p) => (
            <RailRow key={p.id} person={p} active={p.id === current?.id} onSelect={() => jump(p.id)} reduceMotion={reduceMotion} />
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

/** Public API: mount this wherever the follow-up queue belongs on the page.
 *  Below 768px, it's just the drag-card. At 768px+, it's the card (no
 *  drag) beside the live rail. */
export default function FollowUpFocus({ people }: { people: PersonSummaryT[] }) {
  const queueState = useFollowUpQueue(people);
  const isDesktop = useIsDesktop();
  const reduceMotion = useReducedMotion() ?? false;

  if (!isDesktop) {
    return <FocusCard queueState={queueState} enableDrag />;
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-6">
      <FocusCard queueState={queueState} enableDrag={false} photoHeight="min(46vh, 380px)" />
      <QueueRail queueState={queueState} reduceMotion={reduceMotion} />
    </div>
  );
}
