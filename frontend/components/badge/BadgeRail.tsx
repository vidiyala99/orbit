"use client";

import { useEffect, useRef } from "react";
import { fullName, type BadgePerson } from "@/lib/badge";
import BadgeAvatar from "./BadgeAvatar";
import type { Decisions } from "./useBadgeQueue";

function PunchMark({ state }: { state: "kept" | "skipped" }) {
  return (
    <span aria-hidden="true" className={`bw-punch ${state === "kept" ? "bw-punch-kept" : "bw-punch-skipped"}`}>
      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5">
        {state === "kept" ? (
          <path d="M2.5 6.2 5 8.6l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M3 3l6 6M9 3 3 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        )}
      </svg>
    </span>
  );
}

/** The whole queue hanging on one lanyard. Tap a badge to jump to that person. */
export default function BadgeRail({
  people,
  index,
  decisions,
  onJump,
}: {
  people: BadgePerson[];
  index: number;
  decisions: Decisions;
  onJump: (index: number) => void;
}) {
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const current = listRef.current?.querySelector<HTMLElement>(`[data-rail-index="${index}"]`);
    if (!current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    current.scrollIntoView({ block: "nearest", inline: "center", behavior: reduce ? "auto" : "smooth" });
  }, [index]);

  return (
    <nav aria-label="Review queue" className="bw-rail relative">
      <div aria-hidden="true" className="bw-lanyard absolute inset-x-0 top-0" />
      <ol ref={listRef} className="bw-rail-list relative flex overflow-x-auto" data-layer="semantic">
        {people.map((person, i) => {
          const state = decisions[person.id];
          const current = i === index;
          const name = fullName(person);
          return (
            <li key={person.id} className="flex shrink-0 flex-col items-center">
              <span aria-hidden="true" className="bw-mini-clip" />
              <button
                type="button"
                data-rail-index={i}
                onClick={() => onJump(i)}
                aria-current={current ? "step" : undefined}
                aria-label={`${name}, ${i + 1} of ${people.length}${state ? `, ${state}` : ""}`}
                className="bw-mini-hit"
              >
                <span className={`bw-mini-badge ${current ? "bw-mini-current" : ""}`}>
                  <BadgeAvatar src={person.avatarUrl} name={name} className="h-full w-full rounded-[2px]" />
                  {state ? <PunchMark state={state} /> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
