/** Situational match tags on Focus cards.
 *  Prefer API `signals`; fall back to light text heuristics until enrichment
 *  grounds tags in LinkedIn/X activity. */

export const SIGNAL_VOCAB = [
  "Potentially hiring",
  "Posted about hiring",
  "Just got funded",
  "Starting new startup",
  "Looking for beta testers",
  "Potential customer",
  "Warm intro",
  "Investor",
  "Design partner",
] as const;

export type SignalTag = (typeof SIGNAL_VOCAB)[number];

const VOCAB = new Map(SIGNAL_VOCAB.map((s) => [s.toLowerCase(), s]));

const RULES: { tag: SignalTag; re: RegExp }[] = [
  { tag: "Posted about hiring", re: /posted.{0,40}(hir|open role|we'?re hiring)/i },
  {
    tag: "Potentially hiring",
    re: /\b(hiring|recruit(er|ing)?|talent|open role|looking for (an? )?(engineer|pm|designer|founding))\b/i,
  },
  { tag: "Just got funded", re: /\b(funded|raised|series [a-c]\b|seed round|closed fund|writing .+ checks)\b/i },
  {
    tag: "Starting new startup",
    re: /\b(founder|co-?founder|starting|founding|new startup|just launched|product builder|indie hacker|building)\b/i,
  },
  {
    tag: "Looking for beta testers",
    re: /\b(beta|testers|early users|design partners?|mvp|prototype|shipping|deploying)\b/i,
  },
  {
    tag: "Design partner",
    re: /\b(design partners?|ai (product|engineer|builder)|ml engineer|eval|agent)\b/i,
  },
  {
    tag: "Potential customer",
    re: /\b(customer|buyer|evaluating|looking for (a )?tool|head of|vp |director|operator)\b/i,
  },
  { tag: "Warm intro", re: /\b(warm intro|introduce|intro to)\b/i },
  {
    tag: "Investor",
    re: /\b(investor|partner,.+ventures|venture|angel|writing checks|seed check|\bgp\b)\b/i,
  },
];

const INTENT_MAP: Record<string, SignalTag> = {
  hiring: "Potentially hiring",
  "investor intro": "Investor",
  investor: "Investor",
  collab: "Design partner",
  customer: "Potential customer",
  beta: "Looking for beta testers",
};

function normalize(raw: string[] | null | undefined, limit = 3): SignalTag[] {
  if (!raw?.length) return [];
  const out: SignalTag[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const label = VOCAB.get(item.trim().toLowerCase());
    if (!label || seen.has(label)) continue;
    out.push(label);
    seen.add(label);
    if (out.length >= limit) break;
  }
  return out;
}

function inferFromText(
  blob: string,
  intent: string | null | undefined,
  priority: string | null | undefined,
  role: string | null | undefined,
  limit = 3,
): SignalTag[] {
  const found: SignalTag[] = [];
  const seen = new Set<string>();
  if (intent) {
    const mapped = INTENT_MAP[intent.trim().toLowerCase()];
    if (mapped) {
      found.push(mapped);
      seen.add(mapped);
    }
  }
  for (const { tag, re } of RULES) {
    if (seen.has(tag)) continue;
    if (blob && re.test(blob)) {
      found.push(tag);
      seen.add(tag);
    }
    if (found.length >= limit) break;
  }
  // Shortlist people should never render with zero chips.
  if (!found.length) {
    if (priority === "needs_you") found.push("Design partner");
    else if (priority === "high") found.push("Warm intro");
    else if (role) found.push("Starting new startup");
  }
  return found.slice(0, limit);
}

/** Merge stored API signals with heuristics so live Luma guests still get chips. */
export function resolveSignalTags(
  input: {
    signals?: string[] | null;
    role?: string | null;
    why?: string | null;
    intent?: string | null;
    priority?: string | null;
  },
  limit = 3,
): SignalTag[] {
  const stored = normalize(input.signals, limit);
  if (stored.length) return stored;
  const blob = [input.role, input.why].filter(Boolean).join(" ");
  return inferFromText(blob, input.intent, input.priority, input.role, limit);
}
