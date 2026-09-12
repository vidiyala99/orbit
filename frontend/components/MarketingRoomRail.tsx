"use client";

/** Room faces: horizontal scroll + edge arrows. Loops like Home Focus queue. */

import { useRef } from "react";

const FACES = [
  { seed: 12, label: "Alex" },
  { seed: 33, label: "Marcus" },
  { seed: 47, label: "Priya" },
  { seed: 15, label: "Jordan" },
  { seed: 28, label: "Sam" },
  { seed: 52, label: "Riley" },
];

export default function MarketingRoomRail() {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollToPos = (left: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    if (typeof el.scrollTo === "function") {
      el.scrollTo({ left, behavior: "smooth" });
    } else {
      el.scrollLeft = left;
    }
  };

  const nudge = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-room-card]");
    const step = (card?.offsetWidth ?? 140) + 16;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const next = el.scrollLeft + dir * step;

    // Loop like Home: past the end → start; before the start → end.
    if (dir > 0 && el.scrollLeft >= max - 4) {
      scrollToPos(0);
      return;
    }
    if (dir < 0 && el.scrollLeft <= 4) {
      scrollToPos(max);
      return;
    }
    scrollToPos(Math.max(0, Math.min(max, next)));
  };

  return (
    <div className="mx-auto max-w-6xl px-5 pb-14 lg:px-8" data-testid="room-rail">
      <div className="mb-5 max-w-lg">
        <h2 className="font-display text-fl-xl font-bold tracking-[-0.02em] text-ink">
          The room, ordered for you
        </h2>
        <p className="mt-2 text-fl-base font-medium text-ink2">
          Best matches float up. Everyone else stays searchable under Events when you need the full
          list.
        </p>
      </div>

      <div className="relative">
        <div
          ref={scrollerRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] touch-pan-x [&::-webkit-scrollbar]:hidden"
        >
          {FACES.map((face, i) => (
            <div
              key={face.label}
              data-room-card
              className="w-[42%] max-w-[11rem] shrink-0 snap-start sm:w-[28%] sm:max-w-[13rem] lg:w-[calc((100%-5*1rem)/6)] lg:max-w-none"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://i.pravatar.cc/240?img=${face.seed}`}
                alt=""
                className="aspect-[3/4] w-full rounded-card object-cover shadow-card"
              />
              <p className="mt-2 font-display text-fl-sm font-bold text-ink">{face.label}</p>
              <p className="text-fl-xs font-medium text-ink3">Rank {i + 1}</p>
            </div>
          ))}
        </div>

        <button
          type="button"
          aria-label="Scroll room left"
          onClick={() => nudge(-1)}
          className="absolute left-1 top-[38%] z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-rule bg-surface/95 text-ink shadow-card"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M8.5 3 4.5 7l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          type="button"
          aria-label="Scroll room right"
          onClick={() => nudge(1)}
          className="absolute right-1 top-[38%] z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-rule bg-surface/95 text-ink shadow-card"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="m5.5 3 4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
