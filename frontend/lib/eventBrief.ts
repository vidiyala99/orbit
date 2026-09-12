/** Infer event kind + approach tip from title/location.
 *  Luma doesn't always give a structured type — titles do. Don't invent a
 *  fake event blurb; classify what we have and tip the triage approach. */

export type EventKind =
  | "Hackathon"
  | "Product launch"
  | "Pitch event"
  | "Builder workshop"
  | "Meetup"
  | "Conference"
  | "Community night";

export type EventBrief = {
  kind: EventKind;
  /** One line: how this room changes how you approach a match. */
  approach: string;
};

const RULES: { kind: EventKind; re: RegExp; approach: string }[] = [
  {
    kind: "Hackathon",
    re: /\b(hackathon|hack\s?day|devn|dev\s*&\s*data|buildathon)\b/i,
    approach: "Lead with what you're shipping tonight and who you still need on the team.",
  },
  {
    kind: "Product launch",
    re: /\b(launch|shipped|product\s+launch|release\s+party)\b/i,
    approach: "Ask what they're launching and offer a concrete intro, trial, or feedback.",
  },
  {
    kind: "Pitch event",
    re: /\b(pitch|demo\s+day|demo\s+night|investor\s+night)\b/i,
    approach: "Listen for the ask — capital, customers, or hires — before you pitch yourself.",
  },
  {
    kind: "Builder workshop",
    re: /\b(workshop|build\s+friday|office\s+hours|cowork|work\s+session)\b/i,
    approach: "Trade specifics (stack, blocker, design partner) over bios.",
  },
  {
    kind: "Meetup",
    re: /\b(meetup|mixer|happy\s+hour|networking|salon)\b/i,
    approach: "Open with shared scene context, then one clear ask.",
  },
  {
    kind: "Conference",
    re: /\b(conference|summit|forum|symposium)\b/i,
    approach: "Use session context — what they spoke on or came to learn — as the opener.",
  },
];

const DEFAULT: EventBrief = {
  kind: "Community night",
  approach: "Find the shared reason you're both in the room, then make one specific ask.",
};

export function eventBrief(title: string, location?: string | null): EventBrief {
  const blob = [title, location].filter(Boolean).join(" ");
  for (const rule of RULES) {
    if (rule.re.test(blob)) {
      return { kind: rule.kind, approach: rule.approach };
    }
  }
  // Co-hosted builder nights often look like "build … x …" without "workshop".
  if (/\bbuild\b/i.test(title) && /\bx\b/i.test(title)) {
    return {
      kind: "Builder workshop",
      approach: "Trade specifics (stack, blocker, design partner) over bios.",
    };
  }
  return DEFAULT;
}
