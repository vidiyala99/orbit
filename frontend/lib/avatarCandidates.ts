/** Display photo candidates — Luma first, then LinkedIn. Never X (platform
 *  defaults look like real images and wreck the stage). */

export function linkedInSlugFromUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    const u = new URL(url.trim());
    if (!/(^|\.)linkedin\.com$/i.test(u.hostname)) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    const inIdx = parts.findIndex((p) => p.toLowerCase() === "in");
    if (inIdx < 0 || !parts[inIdx + 1]) return null;
    return parts[inIdx + 1];
  } catch {
    return null;
  }
}

/** Ordered URLs for <img>. Empty → PhotoFallback. */
export function avatarCandidates(input: {
  avatar_url?: string | null;
  linkedin_url?: string | null;
}): string[] {
  const out: string[] = [];
  const luma = input.avatar_url?.trim();
  if (luma) out.push(luma);

  const li = linkedInSlugFromUrl(input.linkedin_url);
  if (li) {
    out.push(`https://unavatar.io/linkedin/${encodeURIComponent(li)}?fallback=false`);
  }
  return out;
}

/** Soft Focus gate: LinkedIn handle or a real Luma photo. X-only blanks stay off Focus. */
export function hasFocusSocialProof(input: {
  avatar_url?: string | null;
  linkedin_url?: string | null;
}): boolean {
  if (input.avatar_url?.trim()) return true;
  if (input.linkedin_url?.trim()) return true;
  return false;
}
