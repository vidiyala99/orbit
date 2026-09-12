/** Per-person approach tip — role archetype + signals, not a room slogan.
 *  Priority: stored signals → who they are (designer/dev/founder/…) → event kind.
 *  Heuristic “filler” signals are ignored so a Designer isn’t treated as a startup. */

import type { EventKind } from "./eventBrief";
import type { SignalTag } from "./signalTags";
import { SIGNAL_VOCAB } from "./signalTags";

export type RoleArchetype =
  | "Designer"
  | "Engineer"
  | "Founder"
  | "Product"
  | "Investor"
  | "Recruiter"
  | "Operator"
  | "Researcher"
  | "Other";

const BY_SIGNAL: Partial<Record<SignalTag, string>> = {
  Investor: "Ask about their thesis and check size — then one intro you can actually make.",
  "Potentially hiring": "Ask which seat is open and what “good” looks like in the first 90 days.",
  "Posted about hiring": "Reference the open role, then ask who owns the hire.",
  "Just got funded": "Congratulate briefly, then ask what they’re hiring or buying next.",
  "Starting new startup": "Ask what they’re shipping this week and where they’re stuck.",
  "Looking for beta testers": "Offer a concrete trial — users, feedback, or a design-partner slot.",
  "Design partner": "Swap one specific blocker and see if you can build together.",
  "Potential customer": "Ask how they solve this today and what would make them switch.",
  "Warm intro": "Ask who they’re hoping to meet — then offer a precise intro.",
};

/** Who they are — different jobs, different openers. */
const BY_ARCHETYPE: Record<RoleArchetype, string> = {
  Designer:
    "Ask what craft problem they’re wrestling with (flows, brand, system) — not “what’s your job.”",
  Engineer:
    "Ask what they’re building and the hardest technical constraint — skip the abstract pitch.",
  Founder:
    "Ask what breaks if they don’t solve their #1 problem this month.",
  Product:
    "Ask which user pain they’re prioritizing and what evidence moved it up.",
  Investor:
    "Ask what they’re hunting for this week — then match with a precise intro.",
  Recruiter:
    "Ask which roles are live and what “strong” looks like in the first screen.",
  Operator:
    "Ask where the process is breaking — tooling, people, or handoffs.",
  Researcher:
    "Ask what question they’re trying to answer and what evidence is missing.",
  Other:
    "Open with one shared detail from their role, then a single concrete ask.",
};

const BY_EVENT: Record<EventKind, string> = {
  Hackathon: "Lead with what you’re building tonight and who you still need.",
  "Product launch": "Ask what they’re launching and offer feedback or an intro.",
  "Pitch event": "Listen for the ask — capital, customers, or hires — before pitching yourself.",
  "Builder workshop": "Trade stack and blocker specifics over bios.",
  Meetup: "Open with shared scene context, then one clear ask.",
  Conference: "Use session context — what they spoke on or came to learn — as the opener.",
  "Community night": "Find the shared reason you’re both here, then one specific ask.",
};

const ARCHETYPE_RULES: { archetype: RoleArchetype; re: RegExp }[] = [
  { archetype: "Designer", re: /\b(design(er|ing)?|ux|ui|product\s*design|brand|creative\s*dir)\b/i },
  {
    archetype: "Engineer",
    re: /\b(engineer|developer|dev\b|swe|fullstack|full-stack|backend|frontend|infra|ml\s*eng|software)\b/i,
  },
  { archetype: "Founder", re: /\b(founder|co-?founder|ceo)\b/i },
  { archetype: "Product", re: /\b(product\s*(manager|lead|builder)|pm\b|cpo)\b/i },
  { archetype: "Investor", re: /\b(investor|partner|venture|vc\b|angel|gp\b)\b/i },
  { archetype: "Recruiter", re: /\b(recruit(er|ing)?|talent|people\s*ops|hiring\s*manager)\b/i },
  { archetype: "Operator", re: /\b(ops|operator|coo|chief\s*of\s*staff|growth)\b/i },
  { archetype: "Researcher", re: /\b(research(er)?|scientist|phd)\b/i },
];

const VOCAB = new Map(SIGNAL_VOCAB.map((s) => [s.toLowerCase(), s]));

function storedSignals(raw: string[] | null | undefined): SignalTag[] {
  if (!raw?.length) return [];
  const out: SignalTag[] = [];
  for (const item of raw) {
    const label = VOCAB.get(item.trim().toLowerCase());
    if (label && !out.includes(label)) out.push(label);
  }
  return out;
}

export function roleArchetype(role: string | null | undefined): RoleArchetype {
  if (!role?.trim()) return "Other";
  for (const { archetype, re } of ARCHETYPE_RULES) {
    if (re.test(role)) return archetype;
  }
  return "Other";
}

export function personApproachTip(input: {
  signals?: string[] | null;
  role?: string | null;
  why?: string | null;
  intent?: string | null;
  priority?: string | null;
  eventKind?: EventKind | null;
}): string {
  for (const tag of storedSignals(input.signals)) {
    const tip = BY_SIGNAL[tag];
    if (tip) return tip;
  }
  const archetype = roleArchetype(input.role);
  if (archetype !== "Other") return BY_ARCHETYPE[archetype];
  if (input.eventKind && BY_EVENT[input.eventKind]) return BY_EVENT[input.eventKind];
  return BY_ARCHETYPE.Other;
}
