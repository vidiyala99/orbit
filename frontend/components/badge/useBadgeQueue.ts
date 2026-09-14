"use client";

import { useCallback, useState } from "react";
import type { TriageState } from "@/lib/badge";

export type Decisions = Record<string, TriageState>;

function nextUndecided(ids: string[], decisions: Decisions, from: number): number {
  for (let i = from + 1; i < ids.length; i++) if (!decisions[ids[i]]) return i;
  for (let i = 0; i < from; i++) if (!decisions[ids[i]]) return i;
  return -1;
}

/**
 * A looping review queue: browsing never decides and never hits a wall (last wraps to
 * first), and deciding moves to the next undecided person.
 */
export function useBadgeQueue(ids: string[], initial?: { index?: number; decisions?: Decisions }) {
  const total = ids.length;
  const [index, setIndex] = useState(() => Math.min(initial?.index ?? 0, Math.max(total - 1, 0)));
  const [decisions, setDecisions] = useState<Decisions>(initial?.decisions ?? {});

  const clamp = useCallback((i: number) => Math.min(Math.max(i, 0), Math.max(total - 1, 0)), [total]);
  const go = useCallback(
    (delta: number) => setIndex((i) => (total ? (((i + delta) % total) + total) % total : 0)),
    [total],
  );
  const jump = useCallback((i: number) => setIndex(clamp(i)), [clamp]);

  const decide = useCallback(
    (id: string, state: TriageState) => {
      const next = { ...decisions, [id]: state };
      setDecisions(next);
      const upNext = nextUndecided(ids, next, ids.indexOf(id));
      if (upNext >= 0) setIndex(upNext);
    },
    [decisions, ids],
  );

  const undo = useCallback(
    (id: string) => {
      setDecisions((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== id)));
      const at = ids.indexOf(id);
      if (at >= 0) setIndex(at);
    },
    [ids],
  );

  const remaining = ids.filter((id) => !decisions[id]).length;
  return { index, total, decisions, remaining, go, jump, decide, undo };
}
