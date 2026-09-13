/** Normalize messy Luma role/bio strings into one scannable list headline.
 *  Does not invent company or title — only reshapes what we already have. */

const MAX_LEN = 72;

/** Pitchy / sentence openers that bury the job in a clause. */
const PITCH_RE =
  /^(looking for|seeking|working on|building|currently|i am|i'm|im |entrepreneur looking)\b/i;

function cleanSpaces(s: string): string {
  return s.replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ").trim();
}

function clipAtWord(s: string, max: number): string {
  if (s.length <= max) return s;
  const slice = s.slice(0, max - 1);
  const cut = slice.lastIndexOf(" ");
  const base = cut > max * 0.45 ? slice.slice(0, cut) : slice;
  return `${base.replace(/[.,;:\-–—]+$/, "")}…`;
}

/** Luma interest piles like "Network , AI , cyber security" — not a real role. */
export function isTagPileRole(role: string | null | undefined): boolean {
  const raw = cleanSpaces(role ?? "");
  if (!raw) return false;
  return (raw.match(/,/g) ?? []).length >= 2 && raw.length < 120 && !/[.!?]/.test(raw);
}

/**
 * List-view headline from a Luma role/bio.
 * - Comma tag piles → "A · B · C"
 * - Long pitches → first clause, clipped
 * - Empty → null (caller shows fallback)
 */
export function guestHeadline(role: string | null | undefined): string | null {
  const raw = cleanSpaces(role ?? "");
  if (!raw) return null;

  // Tag pile: "Network , AI , cyber security"
  if (isTagPileRole(raw)) {
    const tags = raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 4);
    return clipAtWord(tags.join(" · "), MAX_LEN);
  }

  // First sentence / clause
  let head = raw.split(/(?<=[.!?])\s+/)[0] ?? raw;
  const dash = head.search(/\s[—–-]\s/);
  if (dash > 12 && dash < 56) head = head.slice(0, dash).trim();

  // "Entrepreneur looking for cofounders…" → keep short lead
  if (PITCH_RE.test(head) || head.length > MAX_LEN) {
    const beforeFor = head.split(/\bfor\b/i)[0]?.trim();
    if (beforeFor && beforeFor.length >= 8 && beforeFor.length < head.length) {
      head = beforeFor.replace(/[,;]+$/, "").trim();
    }
  }

  return clipAtWord(head, MAX_LEN);
}
