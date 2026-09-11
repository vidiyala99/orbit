/** Linkup research prose sometimes comes back as a confident negative
 *  ("No evidence found that X is relevant...") rather than an empty string.
 *  Treat that as no signal — render nothing rather than surfacing the
 *  negative sentence as if it were a real relevance bubble. */
const NEGATIVE_PATTERNS: RegExp[] = [
  /no evidence found/i,
  /does not (appear|indicate)/i,
  /no public (signals?|indication)/i,
];

export function hasRelevanceSignal(text: string | null | undefined): boolean {
  if (!text || !text.trim()) return false;
  return !NEGATIVE_PATTERNS.some((pattern) => pattern.test(text));
}
