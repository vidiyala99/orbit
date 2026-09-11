/** Job-search re-ranking heuristic for the Home shortlist.
 *
 *  The user's sole goal on this account is finding a job, so people who can
 *  actually move that forward should rank above people who merely score
 *  well on the backend's generic relevance model. This is a pure function
 *  so it's testable without the network/fetch plumbing in lib/events.ts.
 */

export type BoostReason = "hiring" | "relevant" | "connector";

export type JobRelevanceResult = { boost: number; reason: BoostReason | null };

/** Case-insensitive substrings of `role` that signal hiring-decision power —
 *  the person most likely to actually get you hired. Highest boost. */
const HIRING_KEYWORDS = [
  "recruit",
  "talent",
  "hiring",
  "head of people",
  "hr",
  "founder",
  "ceo",
  "coo",
  "chief",
  "vp ",
  "vice president",
  "director",
];

/** Case-insensitive substrings of `role` that suggest a well-connected
 *  community-builder — a proxy for "this person could make an intro."
 *  This is a heuristic on job title alone, not a real relationship-graph
 *  path-finding score; the schema has no connection data to compute that. */
const CONNECTOR_KEYWORDS = ["community", "lead", "host", "organizer"];

const HIRING_BOOST = 1000;
const RELEVANCE_BOOST = 400;
const CONNECTOR_BOOST = 100;

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => needle.length > 0 && haystack.includes(needle));
}

/** Words worth matching individually against a role (drops short filler
 *  words like "a"/"in"/"the" so e.g. target_role "product manager" matches
 *  a guest role of "Product Lead" via the shared word "product"). */
function significantWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4);
}

/** Computes how much a guest's effective shortlist rank should be boosted
 *  given the signed-in user's job target. Returns `{ boost: 0, reason: null }`
 *  when the user hasn't set a target yet (nothing to boost against) or when
 *  nothing about the person matches. Callers add `boost` to the backend
 *  `score` and re-sort — the displayed score itself is never changed. */
export function computeJobRelevanceBoost(
  person: { role: string | null | undefined },
  targetRole: string | null | undefined,
  targetIndustries: string[] | null | undefined,
): JobRelevanceResult {
  const hasTarget = !!(targetRole && targetRole.trim()) || !!(targetIndustries && targetIndustries.length > 0);
  if (!hasTarget) return { boost: 0, reason: null };

  const role = (person.role ?? "").toLowerCase();
  if (!role) return { boost: 0, reason: null };

  if (includesAny(role, HIRING_KEYWORDS)) {
    return { boost: HIRING_BOOST, reason: "hiring" };
  }

  const industryMatch = (targetIndustries ?? []).some((industry) => {
    const needle = industry.trim().toLowerCase();
    return needle.length > 0 && role.includes(needle);
  });

  const trimmedTargetRole = (targetRole ?? "").trim().toLowerCase();
  const roleMatch =
    trimmedTargetRole.length > 0 &&
    (role.includes(trimmedTargetRole) || significantWords(trimmedTargetRole).some((w) => role.includes(w)));

  if (industryMatch || roleMatch) {
    return { boost: RELEVANCE_BOOST, reason: "relevant" };
  }

  if (includesAny(role, CONNECTOR_KEYWORDS)) {
    return { boost: CONNECTOR_BOOST, reason: "connector" };
  }

  return { boost: 0, reason: null };
}
