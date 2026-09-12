"use client";

/** Interactive marketing Focus stage.
 *  Mobile: photo-edge chevrons + filmstrip (no name-flanking arrows).
 *  Desktop: photo edges + NameNav + filmstrip (unchanged good layout). */

import { useCallback, useEffect, useRef, useState } from "react";

type Match = {
  id: string;
  name: string;
  role: string;
  approach: string;
  why: string;
  tags: string[];
  photo: string;
};

const MATCHES: Match[] = [
  {
    id: "alex",
    name: "Alex Chen",
    role: "Building agent infra at Render",
    approach:
      "Ask what they are shipping this week in the eval loop. Your Focus overlaps their runtime work.",
    why: "Building agent infra, overlap with your Render work.",
    tags: ["Agent infra", "Design partner", "Evals in prod"],
    photo: "https://i.pravatar.cc/800?img=12",
  },
  {
    id: "marcus",
    name: "Marcus Ellis",
    role: "Founding engineer on agent runtimes",
    approach: "Open with the runtime gap you hit last sprint. He is shipping the layer you would sit on.",
    why: "Shipping the runtime your agent stack would sit on.",
    tags: ["Runtime", "Infra", "Collaborator"],
    photo: "https://i.pravatar.cc/800?img=33",
  },
  {
    id: "priya",
    name: "Priya Raman",
    role: "Hiring an ML engineer this quarter",
    approach: "Lead with the ranking stack you just shipped. She is hiring into that exact problem.",
    why: "Hiring an ML engineer; you just shipped a ranking stack.",
    tags: ["Hiring", "ML", "Ranking"],
    photo: "https://i.pravatar.cc/800?img=47",
  },
  {
    id: "jordan",
    name: "Jordan Miles",
    role: "Product at an evals startup",
    approach: "Ask how they run offline evals today. Your tooling pitch lands if they feel the pain.",
    why: "Lives in the same eval loop your Focus names.",
    tags: ["Evals", "Product", "Startup"],
    photo: "https://i.pravatar.cc/800?img=15",
  },
  {
    id: "sam",
    name: "Sam Okonkwo",
    role: "Design partner hunting builders",
    approach: "Show the Focus card. They care about who is worth the hallway minute.",
    why: "Looking for builders who match on intent, not title.",
    tags: ["Design partner", "Intent", "Lobby"],
    photo: "https://i.pravatar.cc/800?img=28",
  },
];

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

function MiniChevron({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      {dir === "prev" ? (
        <path d="M7.5 2.5 4 6l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M4.5 2.5 8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

/** Desktop only: prev/next flanking the name (matches Home wide layout). */
function NameNav({
  name,
  onPrev,
  onNext,
}: {
  name: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  const btn =
    "btn-press flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-ink/12 bg-surface text-ink2 hover:bg-ink/[0.06] hover:text-ink";
  return (
    <div className="mt-1 hidden min-w-0 items-center gap-2 lg:flex">
      <button type="button" aria-label="Previous person" onClick={onPrev} className={btn}>
        <Chevron dir="prev" />
      </button>
      <p className="min-w-0 flex-1 truncate font-display text-fl-xl font-bold tracking-[-0.03em] text-ink">
        {name}
      </p>
      <button type="button" aria-label="Next person" onClick={onNext} className={btn}>
        <Chevron dir="next" />
      </button>
    </div>
  );
}

function Filmstrip({
  index,
  onSelect,
}: {
  index: number;
  onSelect: (i: number) => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [canRight, setCanRight] = useState(true);
  const [canLeft, setCanLeft] = useState(false);

  const sync = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    return () => el.removeEventListener("scroll", sync);
  }, [sync]);

  useEffect(() => {
    const el = stripRef.current;
    const btn = el?.querySelector<HTMLElement>(`[data-film="${index}"]`);
    if (!el || !btn) return;
    // Keep the active face in view without centering (centering the last
    // item was shoving the strip and blowing mobile layout).
    const left = btn.offsetLeft;
    const right = left + btn.offsetWidth;
    const viewLeft = el.scrollLeft;
    const viewRight = viewLeft + el.clientWidth;
    const nextLeft =
      left < viewLeft + 8
        ? Math.max(0, left - 16)
        : right > viewRight - 8
          ? right - el.clientWidth + 16
          : null;
    if (nextLeft == null) return;
    if (typeof el.scrollTo === "function") {
      el.scrollTo({ left: nextLeft, behavior: "smooth" });
    } else {
      el.scrollLeft = nextLeft;
    }
  }, [index]);

  return (
    <div className="relative min-w-0 overflow-hidden border-t border-rule bg-surface">
      <div
        ref={stripRef}
        className="flex max-w-full items-center gap-2.5 overflow-x-auto overscroll-x-contain px-4 py-3 touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] sm:px-5 [&::-webkit-scrollbar]:hidden"
      >
        {MATCHES.map((person, i) => (
          <button
            key={person.id}
            type="button"
            data-film={i}
            aria-label={`Show ${person.name}`}
            aria-current={i === index ? "true" : undefined}
            onClick={() => onSelect(i)}
            className="btn-press shrink-0 rounded-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={person.photo}
              alt=""
              width={40}
              height={40}
              className={`h-10 w-10 rounded-full object-cover ${
                i === index ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : "opacity-75"
              }`}
            />
          </button>
        ))}
      </div>

      {canLeft ? (
        <button
          type="button"
          aria-label="Scroll filmstrip left"
          onClick={() => stripRef.current?.scrollBy({ left: -72, behavior: "smooth" })}
          className="absolute left-1.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-rule bg-surface/95 text-ink shadow-card lg:hidden"
        >
          <MiniChevron dir="prev" />
        </button>
      ) : null}

      {canRight ? (
        <button
          type="button"
          aria-label="Scroll filmstrip right"
          onClick={() => stripRef.current?.scrollBy({ left: 72, behavior: "smooth" })}
          className="absolute right-1.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-rule bg-surface/95 text-ink shadow-card lg:hidden"
        >
          <MiniChevron dir="next" />
        </button>
      ) : null}
    </div>
  );
}

export default function MarketingFocusPreview() {
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const axis = useRef<"none" | "h" | "v">("none");
  const deltaX = useRef(0);

  const match = MATCHES[index];
  const remaining = MATCHES.length - index;

  const go = useCallback((next: number) => {
    setIndex(((next % MATCHES.length) + MATCHES.length) % MATCHES.length);
    setDragX(0);
    setDragging(false);
  }, []);

  const endSwipe = () => {
    if (startX.current == null) {
      setDragging(false);
      setDragX(0);
      return;
    }
    const dx = deltaX.current;
    // Familiar carousel: swipe left → next, swipe right → previous.
    if (axis.current === "h" && Math.abs(dx) > 40) {
      if (dx < 0) go(index + 1);
      else go(index - 1);
    } else {
      setDragX(0);
      setDragging(false);
    }
    startX.current = null;
    startY.current = null;
    axis.current = "none";
    deltaX.current = 0;
  };

  return (
    <figure data-testid="focus-preview" className="min-w-0 max-w-full">
      <div
        className="overflow-hidden rounded-hero border border-rule bg-surface shadow-raised"
        aria-roledescription="carousel"
        aria-label="Focus match preview"
      >
        <div className="border-b border-rule bg-ground/70 px-4 py-3 sm:px-5">
          <p className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink3">
            Happening now
          </p>
          <p className="mt-1 font-display text-fl-base font-bold tracking-[-0.02em] text-ink">
            build fridays sf
          </p>
          <p className="text-fl-sm font-medium text-ink2">
            {remaining} left · ranked for your Focus
          </p>
        </div>

        <div className="grid min-w-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="min-w-0">
            <div
              className="relative min-h-[240px] touch-pan-y select-none bg-ink sm:min-h-[280px]"
              style={{
                transform: dragX ? `translateX(${dragX * 0.35}px)` : undefined,
                transition: dragging ? "none" : "transform 180ms ease-out",
              }}
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).closest("button")) return;
                if (e.pointerType === "mouse" && e.button !== 0) return;
                startX.current = e.clientX;
                startY.current = e.clientY;
                axis.current = "none";
                deltaX.current = 0;
                setDragging(true);
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (startX.current == null || startY.current == null) return;
                const dx = e.clientX - startX.current;
                const dy = e.clientY - startY.current;
                if (axis.current === "none") {
                  if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                  // Lock to horizontal only when the gesture is clearly sideways.
                  axis.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
                  if (axis.current === "v") {
                    // Let the page scroll; abandon carousel drag.
                    try {
                      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                    } catch {
                      /* already released */
                    }
                    startX.current = null;
                    startY.current = null;
                    setDragging(false);
                    setDragX(0);
                    return;
                  }
                }
                if (axis.current !== "h") return;
                deltaX.current = dx;
                setDragX(dx);
              }}
              onPointerUp={endSwipe}
              onPointerCancel={() => {
                startX.current = null;
                startY.current = null;
                axis.current = "none";
                deltaX.current = 0;
                setDragging(false);
                setDragX(0);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={match.id}
                src={match.photo}
                alt=""
                draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[50%_18%]"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 via-ink/35 to-transparent p-4 pt-16">
                <ul className="flex flex-wrap gap-1.5" aria-label="Match signals">
                  {match.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-md bg-accent px-2.5 py-1 font-mono text-[0.6875rem] font-semibold tracking-[0.02em] text-white"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                aria-label="Previous person"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  go(index - 1);
                }}
                className="absolute bottom-[30%] left-0 top-[16%] z-20 flex w-[28%] items-center justify-start pl-2"
              >
                <span className="pointer-events-none flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white ring-1 ring-white/25">
                  <Chevron dir="prev" />
                </span>
              </button>
              <button
                type="button"
                aria-label="Next person"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  go(index + 1);
                }}
                className="absolute bottom-[30%] right-0 top-[16%] z-20 flex w-[28%] items-center justify-end pr-2"
              >
                <span className="pointer-events-none flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white ring-1 ring-white/25">
                  <Chevron dir="next" />
                </span>
              </button>
            </div>

            <Filmstrip index={index} onSelect={go} />
          </div>

          <div className="flex min-w-0 flex-col gap-4 bg-surface-raised p-4 sm:p-5">
            <div className="min-w-0">
              <p className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink3">
                Top match
              </p>
              {/* Mobile: plain name. Desktop: NameNav with flanking arrows. */}
              <p className="mt-1 truncate font-display text-fl-xl font-bold tracking-[-0.03em] text-ink lg:hidden">
                {match.name}
              </p>
              <NameNav
                name={match.name}
                onPrev={() => go(index - 1)}
                onNext={() => go(index + 1)}
              />
              <p className="mt-0.5 text-fl-sm font-medium leading-snug text-ink2">{match.role}</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => go(index + 1)}
                className="btn-press inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-rule bg-surface px-3 text-fl-sm font-bold text-ink2"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={() => go(index + 1)}
                className="btn-press inline-flex min-h-11 flex-[1.35] items-center justify-center rounded-md bg-accent px-3 text-fl-sm font-bold text-white shadow-glow"
              >
                Keep
              </button>
            </div>

            <div className="rounded-card border border-rule/70 bg-ground/50 px-3.5 py-3">
              <p className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-ink3">
                How to approach
              </p>
              <p className="mt-1.5 text-fl-sm font-medium leading-snug text-ink2">{match.approach}</p>
              <p className="mt-3 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-ink3">
                Why meet
              </p>
              <p className="mt-1.5 text-fl-sm font-medium leading-snug text-ink2">{match.why}</p>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-fl-sm font-medium text-ink2">
        Swipe the photo or tap the arrows. Faces below jump to anyone.
      </figcaption>
    </figure>
  );
}
