/** Hiring-power titles for Focus shortlist — founders/C-suite often hire
 *  even when embedding score vs Struggle is middling. */

const HIRING_TITLE_RE =
  /\b(co-?founders?|founders?|ceo|cto|coo|cfo|cpo|chief\s+\w+|vice[\s-]?president|\bvps?\b|head\s+of\s+\w+|managing\s+director)\b/i;

/** Added to backend score (typically 0–1) so titles float into the queue. */
export const HIRING_TITLE_BOOST = 0.18;

export function hasHiringTitle(role: string | null | undefined): boolean {
  return !!role?.trim() && HIRING_TITLE_RE.test(role);
}

export function focusQueueScore(person: {
  score?: number | null;
  role?: string | null;
}): number {
  const base = person.score ?? 0;
  return base + (hasHiringTitle(person.role) ? HIRING_TITLE_BOOST : 0);
}
