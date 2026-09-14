import type { PersonSummaryT } from "./events";
import { personApproachTip } from "./personApproach";
import { resolveSignalTags } from "./signalTags";

export type TriageState = "kept" | "skipped";

export type BadgePerson = {
  id: string;
  firstName: string;
  lastName: string;
  /** Role line without the company when one could be split off. */
  title: string;
  /** "Where they work", split from the role line; null rather than a guess. */
  company: string | null;
  avatarUrl: string | null;
  linkedinUrl: string | null;
  xUrl: string | null;
  priority: "needs_you" | "high" | "later";
  signals: string[];
  /** Always present: the researched opener, or a role-based tip. */
  approach: string;
  /** Empty when it only repeats the approach line. */
  why: string;
  recent: string | null;
  about: string | null;
  companyBullets: string[];
};

export type BadgeEvent = {
  id: string;
  title: string;
  startsAt: string | null;
};

export const TIER_LABEL: Record<BadgePerson["priority"], string> = {
  needs_you: "Top match",
  high: "Strong match",
  later: "Worth a look",
};

export function fullName(person: Pick<BadgePerson, "firstName" | "lastName">): string {
  return [person.firstName, person.lastName].filter(Boolean).join(" ");
}

export function titleLine(person: Pick<BadgePerson, "title" | "company">): string {
  return [person.title, person.company].filter(Boolean).join(", ");
}

/** Soften research jargon before it reaches the badge. */
export function polishCopy(text: string | null | undefined): string {
  return (text ?? "")
    .replace(/\bhiring_power\b/gi, "hiring opportunity")
    .replace(/\bfounder_peer\b/gi, "founder peer")
    .replace(/\bwarm_intro\b/gi, "warm intro")
    // Product copy uses no em or en dashes: a spaced dash between clauses becomes a colon.
    .replace(/\s+[—–]\s+/g, ": ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalized(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Same text, or one long passage containing the other. */
export function overlaps(a: string, b: string): boolean {
  if (!a || !b) return false;
  const x = normalized(a);
  const y = normalized(b);
  if (x === y) return true;
  if (x.length >= 40 && y.includes(x)) return true;
  if (y.length >= 40 && x.includes(y)) return true;
  return false;
}

const ROLE_SPLIT = /^(.{2,80}?)\s+(?:@|at|-|–|—)\s+(.{2,60})$/i;

/**
 * "Founder & CEO - SuperU" -> { title: "Founder & CEO", company: "SuperU" }.
 * Only explicit separators with spaces around them count; anything else keeps the whole
 * role as the title and no company, so a bio sentence is never mistaken for an employer.
 */
export function splitRole(raw: string | null | undefined): { title: string; company: string | null } {
  const lines = (raw ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return { title: "", company: null };

  const [first, ...rest] = lines;
  const extra = rest.join(", ");
  const match = first.match(ROLE_SPLIT);
  const company = match?.[2]?.trim() ?? "";
  const looksLikeCompany = company && company.split(/\s+/).length <= 5 && !/[.!?]/.test(company);

  if (match && looksLikeCompany) {
    return { title: [match[1].trim(), extra].filter(Boolean).join(", "), company };
  }
  return { title: [first, extra].filter(Boolean).join(", "), company: null };
}

export function toBadgePerson(p: PersonSummaryT): BadgePerson {
  const { title, company } = splitRole(p.role);
  const evidence = (p.evidence ?? []).filter((e) => e?.quote?.trim());
  const quote = (sourceId: string) => polishCopy(evidence.find((e) => e.source_id === sourceId)?.quote);

  const approach =
    quote("approach") ||
    polishCopy(
      personApproachTip({ signals: p.signals, role: p.role, why: p.why, intent: p.intent, priority: p.priority }),
    );
  const why = polishCopy(p.why);
  const recentText = quote("recent") || quote("trajectory") || polishCopy(p.what_talked);
  const recent = recentText && !overlaps(recentText, why) && !overlaps(recentText, p.role ?? "") ? recentText : null;

  return {
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    title,
    company,
    avatarUrl: p.avatar_url ?? null,
    linkedinUrl: p.linkedin_url ?? null,
    xUrl: p.x_url ?? null,
    priority: p.priority,
    signals: resolveSignalTags({
      signals: p.signals,
      role: p.role,
      why: p.why,
      intent: p.intent,
      priority: p.priority,
    }).slice(0, 3),
    approach,
    why: overlaps(why, approach) ? "" : why,
    recent,
    about: quote("about") || null,
    companyBullets: [],
  };
}

/** "Sat 10:00" in the viewer's own timezone. */
export function formatEventTime(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.toLocaleDateString("en-US", { weekday: "short" });
  const time = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day} ${time}`;
}
