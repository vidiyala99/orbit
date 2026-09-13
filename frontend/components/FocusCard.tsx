"use client";

/** Match stage — calm instrument (DESIGN.md).
 *  Soft field, no white-cage. Phone: capped photo + explicit browse + Keep.
 *  Desktop: photo | panel + avatar filmstrip. */

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { triagePerson } from "@/lib/api";
import { getClientToken } from "@/lib/auth";
import { avatarCandidates } from "@/lib/avatarCandidates";
import { displayInitials } from "@/lib/displayAvatar";
import type { PersonSummaryT } from "@/lib/events";
import { APP_INBOX } from "@/lib/routes";
import { resolveSignalTags } from "@/lib/signalTags";
import { eventBrief, type EventKind } from "@/lib/eventBrief";
import { personApproachTip } from "@/lib/personApproach";
import { PhotoFallback } from "./PhotoFallback";

const PHONE_MAX = "(max-width: 767px)";
const CARD_SPRING = { type: "spring", stiffness: 420, damping: 36 } as const;

type HomeLayout = "phone" | "wide";

function subscribePhone(onStoreChange: () => void) {
  const mql = window.matchMedia(PHONE_MAX);
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

function getPhoneSnapshot() {
  return window.matchMedia(PHONE_MAX).matches;
}

/** false on server + first hydration paint — avoids phone/desktop tree mismatch. */
function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function useHomeLayout(): HomeLayout {
  const isPhone = useSyncExternalStore(subscribePhone, getPhoneSnapshot, () => false);
  return isPhone ? "phone" : "wide";
}

const PRIORITY_LABEL: Record<string, string> = {
  needs_you: "Top match",
  high: "Strong match",
  later: "Later",
};

function personSignals(person: PersonSummaryT) {
  return resolveSignalTags({
    signals: person.signals,
    role: person.role,
    why: person.why,
    intent: person.intent,
    priority: person.priority,
  });
}

function SignalChips({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Match signals">
      {tags.map((tag) => (
        <li
          key={tag}
          className="rounded-md bg-accent px-2.5 py-1 font-mono text-[0.6875rem] font-semibold tracking-[0.02em] text-white"
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}

function DossierSection({
  label,
  children,
  muted,
}: {
  label: string;
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <div>
      <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.07em] text-ink3">{label}</p>
      <div className={`mt-1 text-[0.9375rem] leading-relaxed ${muted ? "text-ink3" : "font-medium text-ink"}`}>
        {children}
      </div>
    </div>
  );
}

/** Shared profile body: real fields first; research gaps stay honest. */
function ProfileDossier({
  person,
  signals,
  hideSignals = false,
  eventKind = null,
}: {
  person: PersonSummaryT;
  signals: string[];
  /** When chips already sit under the name (desktop). */
  hideSignals?: boolean;
  eventKind?: EventKind | null;
}) {
  const why = person.why?.trim() || "";
  const role = person.role?.trim() || "";
  const rawContext = (person.what_talked || person.note || person.note_payload || "").trim();
  const sameText = (a: string, b: string) =>
    a.replace(/\s+/g, " ").trim().toLowerCase() === b.replace(/\s+/g, " ").trim().toLowerCase();
  // Role already sits under the name; Context often repeats the same Luma bio.
  const context =
    rawContext && !sameText(rawContext, role) && !sameText(rawContext, why) ? rawContext : "";
  const evidence = (person.evidence ?? []).filter((e) => e?.quote?.trim());
  const approachEvidence = evidence.find((e) => e.source_id === "approach")?.quote?.trim();
  const recentEvidence = evidence.find((e) => e.source_id === "recent")?.quote?.trim();
  const otherEvidence = evidence.filter(
    (e) => e.source_id !== "approach" && e.source_id !== "recent",
  );
  const hasResearch = evidence.length > 0 || Boolean(context);
  const approach =
    approachEvidence ||
    personApproachTip({
      signals: person.signals,
      role: person.role,
      why: person.why,
      intent: person.intent,
      priority: person.priority,
      eventKind,
    });

  return (
    <div className="flex flex-col gap-3.5">
      <DossierSection label="How to approach">{approach}</DossierSection>
      {why && !sameText(why, role) ? <DossierSection label="Alignment">{why}</DossierSection> : null}
      {!hideSignals && signals.length ? (
        <DossierSection label="Signals">
          <SignalChips tags={signals} />
        </DossierSection>
      ) : null}
      {person.event_title ? <DossierSection label="Event">{person.event_title}</DossierSection> : null}
      {recentEvidence ? (
        <DossierSection label="Recent">{recentEvidence}</DossierSection>
      ) : null}
      {context ? <DossierSection label="Context">{context}</DossierSection> : null}
      {otherEvidence.length ? (
        <DossierSection label="Evidence">
          <ul className="flex flex-col gap-1.5">
            {otherEvidence.map((item) => (
              <li key={`${item.source_id}:${item.quote}`}>“{item.quote}”</li>
            ))}
          </ul>
        </DossierSection>
      ) : null}
      {!hasResearch ? (
        <DossierSection label="Trajectory & recent work" muted>
          Not researched yet — enrichment fills trajectory, recent posts, and accomplishments from
          LinkedIn/X.
        </DossierSection>
      ) : null}
    </div>
  );
}

function initials(person: PersonSummaryT): string {
  const a = person.first_name.trim().charAt(0);
  const b = person.last_name.trim().charAt(0);
  return `${a}${b}`.toUpperCase() || "?";
}

function useReviewQueue(people: PersonSummaryT[]) {
  const [queue, setQueue] = useState(people);
  const [index, setIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastKeptName, setLastKeptName] = useState<string | null>(null);

  const total = queue.length;
  const current = queue[index] ?? null;

  function go(delta: number) {
    if (total <= 1) return;
    setIndex((i) => (i + delta + total) % total);
  }
  function jump(id: string) {
    const i = queue.findIndex((p) => p.id === id);
    if (i >= 0) setIndex(i);
  }

  async function act(state: "kept" | "skipped") {
    if (!current || pending) return;
    const token = getClientToken();
    if (!token) {
      setError("You're signed out — refresh and try again.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await triagePerson(current.id, state, token);
      if (state === "kept") {
        setLastKeptName(`${current.first_name} ${current.last_name}`.trim());
      }
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

  return { queue, index, total, current, pending, error, lastKeptName, go, jump, act };
}

type QueueState = ReturnType<typeof useReviewQueue>;

function useResolvedAvatar(person: Pick<PersonSummaryT, "avatar_url" | "linkedin_url">) {
  const candidates = avatarCandidates(person);
  const key = candidates.join("|");
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    setIdx(0);
  }, [key]);
  return {
    url: candidates[idx] ?? null,
    advance: () => setIdx((i) => i + 1),
  };
}

function ProfilePhoto({
  person,
  initialsLabel,
  urgent,
  maxH,
  signals = [],
  socialName,
}: {
  person: Pick<PersonSummaryT, "avatar_url" | "linkedin_url" | "x_url">;
  initialsLabel: string;
  urgent: boolean;
  maxH: number;
  /** On-photo chips — easier to catch than panel chrome. */
  signals?: string[];
  socialName?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const { url, advance } = useResolvedAvatar(person);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    setNatural(null);
  }, [url]);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [url]);

  const minH = 140;
  let frameH = Math.min(220, maxH);
  let objectPos = "object-[center_28%]";
  if (!url) {
    frameH = Math.min(Math.max(280, Math.round(maxH * 0.55)), maxH);
  } else if (natural && natural.w > 0 && width > 0) {
    const ratio = natural.w / natural.h;
    const ideal = width / ratio;
    frameH = Math.round(Math.min(maxH, Math.max(minH, ideal)));
    objectPos =
      ratio > 1.25 ? "object-center" : ratio < 0.85 ? "object-[center_22%]" : "object-[center_28%]";
  }

  const showOverlay = signals.length > 0 || person.linkedin_url || person.x_url;

  return (
    <div
      ref={frameRef}
      className="relative w-full overflow-hidden rounded-md bg-ink/[0.06]"
      style={{ height: frameH }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={url}
          src={url}
          alt=""
          onError={advance}
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
              setNatural({ w: img.naturalWidth, h: img.naturalHeight });
            }
          }}
          className={`absolute inset-0 h-full w-full object-cover ${objectPos}`}
        />
      ) : (
        <PhotoFallback initials={initialsLabel} urgent={urgent} />
      )}
      {showOverlay ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-4 pb-4 pt-12">
          {signals.length ? <SignalChips tags={signals} /> : null}
          {socialName ? (
            <MatchSocials
              name={socialName}
              linkedinUrl={person.linkedin_url}
              xUrl={person.x_url}
              onDark
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Avatar row only — names via accessible label (DESIGN.md distill). */
function Filmstrip({ queueState }: { queueState: QueueState }) {
  const { queue, current, jump } = queueState;
  if (queue.length <= 1) return null;
  return (
    <section aria-label="Queue" className="mt-4 border-t border-ink/[0.08] pt-3">
      <div className="flex gap-2.5 overflow-x-auto pb-0.5">
        {queue.map((p) => {
          const active = p.id === current?.id;
          const label = `${p.first_name} ${p.last_name}`;
          return (
            <button
              key={p.id}
              type="button"
              title={label}
              aria-label={label}
              aria-current={active ? "true" : undefined}
              onClick={() => jump(p.id)}
              className={[
                "btn-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-fl-xs font-semibold transition-colors",
                active
                  ? "bg-accent text-white ring-2 ring-accent/35 ring-offset-2 ring-offset-ground"
                  : "bg-ink/[0.08] text-ink2 hover:bg-ink/[0.12]",
              ].join(" ")}
            >
              {p.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                displayInitials(label)
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Chevron({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {dir === "prev" ? (
        <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

/** Compact prev/next flanking the name — wraps; no end-of-list vanish. */
function NameNav({
  name,
  canBrowse,
  onPrev,
  onNext,
}: {
  name: string;
  canBrowse: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const btn =
    "btn-press flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-ink/12 bg-surface-raised text-ink2 hover:bg-ink/[0.06] hover:text-ink disabled:pointer-events-none disabled:opacity-0";
  return (
    <div className="mt-2 flex min-w-0 items-center gap-2">
      <button type="button" aria-label="Previous person" disabled={!canBrowse} onClick={onPrev} className={btn}>
        <Chevron dir="prev" />
      </button>
      <p className="min-w-0 truncate font-display text-[1.75rem] font-bold leading-tight tracking-[-0.04em] text-ink md:text-[2rem]">
        {name}
      </p>
      <button type="button" aria-label="Next person" disabled={!canBrowse} onClick={onNext} className={btn}>
        <Chevron dir="next" />
      </button>
    </div>
  );
}
/** Touch chips on the match — words only, ≥44px, above browse hit zones. */
function MatchSocials({
  name,
  linkedinUrl,
  xUrl,
  onDark = false,
}: {
  name: string;
  linkedinUrl?: string | null;
  xUrl?: string | null;
  onDark?: boolean;
}) {
  const linkedin = linkedinUrl?.trim() || null;
  const x = xUrl?.trim() || null;
  if (!linkedin && !x) return null;
  const chip = onDark
    ? "btn-press inline-flex min-h-11 items-center rounded-md bg-black/55 px-4 text-[0.8125rem] font-semibold text-white ring-1 ring-white/35 backdrop-blur-[2px] hover:bg-black/70"
    : "btn-press inline-flex min-h-11 items-center rounded-md border border-ink/15 bg-surface-raised px-4 text-[0.8125rem] font-semibold text-ink2 hover:bg-ink/[0.05] hover:text-ink";
  return (
    <div className="pointer-events-auto relative z-20 mt-2.5 flex flex-wrap items-center gap-2">
      {linkedin ? (
        <a
          href={linkedin}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${name} on LinkedIn`}
          className={chip}
        >
          LinkedIn
        </a>
      ) : null}
      {x ? (
        <a href={x} target="_blank" rel="noopener noreferrer" aria-label={`${name} on X`} className={chip}>
          X
        </a>
      ) : null}
    </div>
  );
}

/** Phone Focus — photo + dossier; scroll/swipe expands, Skip/Keep stay put. */
function PhoneStage({
  person,
  index,
  total,
  pending,
  error,
  onPrev,
  onNext,
  onSkip,
  onKeep,
}: {
  person: PersonSummaryT;
  index: number;
  total: number;
  pending: boolean;
  error: string | null;
  onPrev: () => void;
  onNext: () => void;
  onSkip: () => void;
  onKeep: () => void;
}) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const dossierScrollRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const label = `${person.first_name} ${person.last_name}`.trim();
  const urgent = person.priority === "needs_you";
  const canBrowse = total > 1;
  const linkedin = person.linkedin_url?.trim() || null;
  const x = person.x_url?.trim() || null;
  const signals = personSignals(person);
  const why = person.why?.trim() || "";
  const { url: photoUrl, advance: advancePhoto } = useResolvedAvatar(person);
  const approachEvidence = (person.evidence ?? []).find((e) => e.source_id === "approach")?.quote?.trim();
  const approach =
    approachEvidence ||
    personApproachTip({
      signals: person.signals,
      role: person.role,
      why: person.why,
      intent: person.intent,
      priority: person.priority,
      eventKind: eventBrief(person.event_title).kind,
    });

  useEffect(() => {
    setOpen(false);
  }, [person.id]);

  // Viewport is overflow-locked on phone — page scroll cannot expand. Wheel /
  // swipe on the stage opens the dossier; swipe up-at-top closes it.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 18 && !open) {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (e.deltaY < -18 && open) {
        const panel = dossierScrollRef.current;
        if (!panel || panel.scrollTop <= 0) {
          e.preventDefault();
          setOpen(false);
        }
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStartY.current;
    touchStartY.current = null;
    if (start == null) return;
    const end = e.changedTouches[0]?.clientY;
    if (end == null) return;
    const dy = start - end; // finger up → positive → “scroll down” to reveal more
    if (dy > 48 && !open) {
      setOpen(true);
      return;
    }
    if (dy < -48 && open) {
      const panel = dossierScrollRef.current;
      if (!panel || panel.scrollTop <= 0) setOpen(false);
    }
  }

  return (
    <div
      ref={stageRef}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className={`grid h-full min-h-0 w-full min-w-0 max-w-full overflow-hidden ${
        open ? "grid-rows-[auto_minmax(5.5rem,0.3fr)_minmax(0,1fr)]" : "grid-rows-[auto_minmax(0,1fr)_auto]"
      }`}
    >
      {total > 1 ? (
        <div className="mb-2 flex gap-1" aria-hidden="true">
          {Array.from({ length: Math.min(total, 16) }, (_, i) => (
            <div
              key={i}
              className={`h-[2px] flex-1 rounded-full ${i === index ? "bg-accent" : i < index ? "bg-accent/40" : "bg-ink/15"}`}
            />
          ))}
        </div>
      ) : (
        <div />
      )}

      <div className="relative min-h-0 overflow-hidden rounded-[12px] bg-ink/[0.1] shadow-card">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={photoUrl}
            src={photoUrl}
            alt=""
            onError={advancePhoto}
            className="absolute inset-0 h-full w-full object-cover object-[center_18%]"
          />
        ) : (
          <PhotoFallback initials={initials(person)} urgent={urgent} />
        )}

        {!open && canBrowse ? (
          <>
            <button
              type="button"
              aria-label="Previous person"
              onClick={onPrev}
              className="absolute bottom-[35%] left-0 top-[18%] z-10 flex w-[28%] items-center justify-start pl-2"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white ring-1 ring-white/25">
                <Chevron dir="prev" />
              </span>
            </button>
            <button
              type="button"
              aria-label="Next person"
              onClick={onNext}
              className="absolute bottom-[35%] right-0 top-[18%] z-10 flex w-[28%] items-center justify-end pr-2"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white ring-1 ring-white/25">
                <Chevron dir="next" />
              </span>
            </button>
          </>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-3 pt-10">
          <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.06em] text-white/65">
            {PRIORITY_LABEL[person.priority] ?? person.priority}
          </p>
          <p className="mt-0.5 font-display text-[1.35rem] font-bold leading-[1.05] tracking-[-0.04em] text-white sm:text-[1.5rem]">
            {label}
          </p>
          {person.role && !open ? (
            <p className="mt-0.5 line-clamp-1 text-[0.8125rem] font-medium text-white/88">{person.role}</p>
          ) : null}
          {!open && signals.length ? (
            <div className="mt-2">
              <SignalChips tags={signals} />
            </div>
          ) : null}
          <MatchSocials name={label} linkedinUrl={linkedin} xUrl={x} onDark />
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-2 pt-2 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-ink/10 bg-surface-raised shadow-sm">
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? "Collapse profile" : "Expand profile"}
            onClick={() => setOpen((v) => !v)}
            className="btn-press flex w-full shrink-0 items-center justify-between gap-3 px-4 pt-2 pb-1 text-left"
          >
            <span className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.07em] text-accent">
              {open ? "Profile" : "Why meet"}
            </span>
            <span aria-hidden="true" className="font-display text-[0.75rem] font-bold tracking-[-0.02em] text-accent">
              {open ? "Less" : "More"}
            </span>
          </button>

          <motion.div
            ref={dossierScrollRef}
            initial={false}
            animate={{ height: open ? "auto" : "2.85rem" }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 420, damping: 36, mass: 0.8 }
            }
            className={`min-h-0 overflow-hidden px-4 ${open ? "overflow-y-auto" : ""}`}
          >
            {!open ? (
              <div className="pb-3">
                <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.07em] text-accent">
                  How to approach
                </p>
                <p className="mt-1 line-clamp-2 text-[0.875rem] font-medium leading-snug text-ink">
                  {approach}
                </p>
              </div>
            ) : (
              <div className="pb-3">
                <ProfileDossier
                  person={person}
                  signals={signals}
                  eventKind={eventBrief(person.event_title).kind}
                />
              </div>
            )}
          </motion.div>
        </div>

        {error ? (
          <p role="alert" className="shrink-0 text-[0.75rem] font-semibold text-rust">
            {error}
          </p>
        ) : null}

        <div className="flex shrink-0 items-center gap-2">
          <motion.button
            type="button"
            disabled={pending}
            onClick={onSkip}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="min-h-11 flex-[0.85] rounded-md border border-ink/15 bg-transparent text-[0.875rem] font-semibold text-ink2 disabled:opacity-50"
          >
            Skip
          </motion.button>
          <motion.button
            type="button"
            disabled={pending}
            onClick={onKeep}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="min-h-11 flex-[1.35] rounded-md bg-accent font-display text-[1rem] font-bold tracking-[-0.02em] text-white shadow-glow disabled:opacity-50"
          >
            Keep
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function FocusCard({
  queueState,
  showFilmstrip,
}: {
  queueState: QueueState;
  showFilmstrip: boolean;
}) {
  const { index, total, current, pending, error, lastKeptName, go, act } = queueState;
  const [direction, setDirection] = useState(1);
  const reduceMotion = useReducedMotion() ?? false;

  function advance(delta: number) {
    setDirection(delta);
    go(delta);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (total <= 1) return;
      if (e.key === "ArrowRight") advance(1);
      if (e.key === "ArrowLeft") advance(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, total]);

  if (!current) {
    return (
      <div className="flex min-h-[36vh] flex-col justify-center gap-3 py-12">
        <p className="font-display text-fl-lg font-bold tracking-[-0.03em] text-ink">Room reviewed</p>
        <p className="max-w-md text-fl-sm text-ink3">
          {lastKeptName
            ? `${lastKeptName} is in your Inbox. Open Inbox when you're ready for the next move.`
            : "Nobody left to review for this event. Kept people wait in your Inbox."}
        </p>
        <Link href={APP_INBOX} className="self-start text-fl-sm font-semibold text-accent hover:underline">
          Open Inbox
        </Link>
      </div>
    );
  }

  const urgent = current.priority === "needs_you";

  const cardVariants = {
    enter: () => (reduceMotion ? { opacity: 1 } : { opacity: 0 }),
    center: { opacity: 1 },
    exit: () => (reduceMotion ? { opacity: 0 } : { opacity: 0 }),
  };

  if (!showFilmstrip) {
    return (
      <div className="relative h-full min-h-0 min-w-0 w-full flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.id}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={reduceMotion ? { duration: 0 } : { duration: 0.18 }}
            className="absolute inset-0 flex min-h-0 flex-col"
          >
            <PhoneStage
              person={current}
              index={index}
              total={total}
              pending={pending}
              error={error}
              onPrev={() => advance(-1)}
              onNext={() => advance(1)}
              onSkip={() => void act("skipped")}
              onKeep={() => void act("kept")}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  const desktopVariants = {
    enter: (dir: number) =>
      reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: dir > 0 ? 40 : -40 },
    center: { opacity: 1, x: 0 },
    exit: (dir: number) =>
      reduceMotion ? { opacity: 0 } : { opacity: 0, x: dir > 0 ? -120 : 120 },
  };

  const desktopSignals = personSignals(current);

  return (
    <div className="flex min-h-0 flex-col md:justify-start">
      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.div
          key={current.id}
          custom={direction}
          variants={desktopVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={reduceMotion ? { duration: 0 } : CARD_SPRING}
          className="grid items-start gap-4 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-6"
        >
          <div className="relative min-w-0 md:sticky md:top-0">
            <ProfilePhoto
              person={current}
              urgent={urgent}
              maxH={360}
              initialsLabel={initials(current)}
              signals={desktopSignals}
              socialName={`${current.first_name} ${current.last_name}`.trim()}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-2.5">
            <div>
              <p className="text-fl-xs font-medium text-ink3">
                {PRIORITY_LABEL[current.priority] ?? current.priority}
              </p>
              <NameNav
                name={`${current.first_name} ${current.last_name}`.trim()}
                canBrowse={total > 1}
                onPrev={() => advance(-1)}
                onNext={() => advance(1)}
              />
              <p className="mt-1 text-fl-base text-ink2">{current.role}</p>
            </div>

            <div className="flex max-w-md items-stretch gap-3">
              <motion.button
                type="button"
                disabled={pending}
                onClick={() => act("skipped")}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="min-h-11 flex-[0.8] rounded-md border border-ink/15 bg-transparent text-fl-sm font-semibold text-ink2 disabled:opacity-50"
              >
                Skip
              </motion.button>
              <motion.button
                type="button"
                disabled={pending}
                onClick={() => act("kept")}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="min-h-11 flex-[1.4] rounded-md bg-accent font-display text-fl-base font-bold tracking-[-0.02em] text-white shadow-glow disabled:opacity-50"
              >
                Keep
              </motion.button>
            </div>

            {error ? (
              <p role="alert" className="text-fl-xs font-semibold text-rust">
                {error}
              </p>
            ) : null}

            <div className="rounded-md border border-ink/10 bg-surface-raised px-4 py-3">
              <ProfileDossier
                person={current}
                signals={desktopSignals}
                hideSignals
                eventKind={eventBrief(current.event_title).kind}
              />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <Filmstrip queueState={queueState} />
    </div>
  );
}

export default function FollowUpFocus({ people }: { people: PersonSummaryT[] }) {
  const queueState = useReviewQueue(people);
  const ready = useIsClient();
  const layout = useHomeLayout();

  if (!ready) {
    return <div className="h-full min-h-0 min-w-0 flex-1" aria-busy="true" />;
  }

  const phone = layout === "phone";

  return (
    <div
      className={
        phone
          ? "flex h-full min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden"
          : "flex min-h-0 min-w-0 max-w-full flex-col overflow-visible"
      }
    >
      <FocusCard queueState={queueState} showFilmstrip={!phone} />
    </div>
  );
}
