/** Reciprocal value tip — what *you* bring to *this* person.
 *  Grounds in their role/why/recent; never a Focus dump or identical mad-lib. */

import type { SignalTag } from "./signalTags";
import { SIGNAL_VOCAB } from "./signalTags";

export type UserFocusT = {
  role: string | null;
  struggle: string | null;
};

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

function clip(text: string, n: number): string {
  const s = text.replace(/\s+/g, " ").trim();
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1).trim()}…`;
}

/** Prefer a product/brand name from Focus Role. */
function yourCraft(focus: UserFocusT): string | null {
  const role = focus.role?.replace(/\s+/g, " ").trim();
  if (!role) return null;
  const named =
    role.match(/\b(?:building|at|of)\s+([A-Z][\w.-]+(?:\s+[A-Z][\w.-]+)?)/)?.[1] ||
    role.match(/\b(Actintro)\b/i)?.[1];
  if (named) return named;
  const head = role.split(/\s*[—–\-|,]\s*/)[0]?.trim();
  if (head && head.length <= 24) return head;
  return head ? clip(head, 24) : null;
}

function theirShop(role: string | null | undefined): string | null {
  if (!role?.trim()) return null;
  const r = role.replace(/\s+/g, " ").trim();
  const at = r.match(
    /\b(?:CEO|CTO|COO|Founder|Co-?founder|Partner|Investor|Head|VP|Director)[^@]*?\s+(?:at|@|of)\s+([^|,/]+)/i,
  );
  if (at?.[1]) return clip(at[1].trim().split(/\s{2,}/)[0], 28);
  const amp = r.match(/@\s*([^|,/]+)/);
  if (amp?.[1]) return clip(amp[1].trim(), 28);
  const at2 = r.split("|")[0]?.trim().match(/\bat\s+(.+)$/i);
  if (at2?.[1]) return clip(at2[1].trim(), 28);
  return null;
}

/** Pull a concrete hook from their world (not your Focus). */
function theirHook(input: {
  role?: string | null;
  why?: string | null;
  recent?: string | null;
}): string | null {
  const blob = [input.recent, input.why, input.role].filter(Boolean).join(" · ");
  if (!blob.trim()) return null;

  const patterns: { re: RegExp; label: (m: RegExpMatchArray) => string }[] = [
    { re: /(\d[\d.,]*\s*[Mk]\+?\s*calls?)/i, label: (m) => m[1] },
    { re: /(red-?team(?:ed|ing)?[^.;,]{0,40})/i, label: (m) => clip(m[1], 42) },
    { re: /(CAPTCHA|anti-?bot|supply[- ]chain|agentic|Voice AI|governance|seed fund|IITB|meetup)/i, label: (m) => m[1] },
    { re: /(?:posted|post)[^.;]{0,8}([^.;]{12,48})/i, label: (m) => clip(m[1], 42) },
    { re: /(raising|Series\s*[A-C]|seed)\b/i, label: (m) => m[1] },
  ];
  for (const { re, label } of patterns) {
    const m = blob.match(re);
    if (m) return label(m);
  }

  // First meaningful chunk of recent / why
  const recent = input.recent?.replace(/\s+/g, " ").trim();
  if (recent && recent.length >= 20) {
    const bit = recent.split(/[.;—–]/)[0]?.trim();
    if (bit && bit.length >= 16) return clip(bit, 48);
  }
  const why = input.why?.replace(/\s+/g, " ").trim();
  if (why && why.length >= 20) {
    const bit = why.split(/[.;—–]/)[0]?.trim();
    if (bit && !/^meet\b/i.test(bit) && bit.length >= 16) return clip(bit, 48);
  }
  return null;
}

function situation(
  tags: SignalTag[],
  intent: string,
): "investor" | "hiring" | "warm" | "peer" | "other" {
  if (tags.includes("Investor") || intent === "investor") return "investor";
  if (
    tags.includes("Potentially hiring") ||
    tags.includes("Posted about hiring") ||
    intent === "hiring_power"
  ) {
    return "hiring";
  }
  if (tags.includes("Warm intro") || intent === "warm_intro") return "warm";
  if (tags.includes("Starting new startup") || intent === "founder_peer") return "peer";
  return "other";
}

/** Stable pick so the same person doesn’t flicker; different people get different beats. */
function pick<T>(key: string, options: T[]): T {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return options[h % options.length]!;
}

/** One crisp lobby sentence — null if Focus is empty. */
export function personYourAngle(input: {
  focus: UserFocusT;
  signals?: string[] | null;
  intent?: string | null;
  role?: string | null;
  why?: string | null;
  recent?: string | null;
  /** Stable id so variants differ per person. */
  personKey?: string | null;
}): string | null {
  const craft = yourCraft(input.focus);
  if (!craft && !input.focus.struggle?.trim()) return null;

  const product = craft ?? "your build";
  const shop = theirShop(input.role);
  const hook = theirHook(input);
  const intent = (input.intent || "").trim().toLowerCase();
  const tags = storedSignals(input.signals);
  const kind = situation(tags, intent);
  const key = `${input.personKey || shop || hook || "x"}:${kind}`;

  if (kind === "investor") {
    const opts = [
      hook && shop
        ? `Use ${hook} as the opener, then offer one ${product} proof point — ask what ${shop} wants to see earlier in agentic founders.`
        : null,
      shop
        ? `Offer one ${product} proof point on real-user adoption, then ask ${shop}’s bar for agentic seed checks.`
        : null,
      hook
        ? `Open on ${hook}, then one ${product} lens — judgment they can reuse on portfolio cos, not a capital ask.`
        : `One ${product} proof point on how the product lands — then ask what they wish founders shipped earlier.`,
    ].filter(Boolean) as string[];
    return pick(key, opts);
  }

  if (kind === "hiring") {
    const opts = [
      hook && shop
        ? `Reference ${hook}, show one ${product} win under time pressure, then ask the ${shop} eng bar.`
        : null,
      shop && hook
        ? `Ask how ${shop} hires for ${hook.includes("red") ? "offensive judgment" : "reliability"} — then one ${product} story that proves it.`
        : null,
      shop
        ? `One ${product} win they’d feel at ${shop}, then ask what “strong” looks like in the first 90 days.`
        : null,
      hook
        ? `Tie one ${product} win to ${hook}, then ask what their bar is for the next hire.`
        : `One ${product} win under time pressure, then ask what “strong” looks like on their eng bar.`,
    ].filter(Boolean) as string[];
    return pick(key, opts);
  }

  if (kind === "warm") {
    const opts = [
      shop
        ? `Lead with one intro or insight from ${product} that helps ${shop} — ask for one back only after.`
        : null,
      hook
        ? `Open on ${hook}, offer one ${product}-shaped intro, then ask who they’re hoping to meet.`
        : `Offer one precise intro from ${product} before you ask for theirs.`,
    ].filter(Boolean) as string[];
    return pick(key, opts);
  }

  if (kind === "peer") {
    const opts = [
      hook && shop
        ? `Trade notes on ${hook}: one ${product} shipping detail for one from ${shop}.`
        : null,
      shop
        ? `Swap one shipping detail — ${product} ↔ ${shop} — skip the bio tour.`
        : null,
      hook
        ? `Open on ${hook}, trade one ${product} shipping detail for theirs.`
        : `Trade one ${product} shipping detail for theirs — peers remember specifics.`,
    ].filter(Boolean) as string[];
    return pick(key, opts);
  }

  return shop
    ? `Open with how ${product} touches ${shop} — one offer, one ask.`
    : `Open with how ${product} touches their world — one offer, one ask.`;
}
