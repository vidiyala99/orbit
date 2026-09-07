/** Deterministic placeholder headshot for a person id. Demo/fixture rows
 *  carry avatar_url: null - this is a display-only fallback (not a product
 *  change) so the UI shows a stable face instead of initials wherever a real
 *  photo isn't set. The same id always resolves to the same photo, so the
 *  marketing pages and the product UI show the same "Alex Chen" everywhere. */
function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}

const PRAVATAR_POOL_SIZE = 70;

export function displayAvatarUrl(id: string, size = 96): string {
  const img = (hashId(id) % PRAVATAR_POOL_SIZE) + 1;
  return `https://i.pravatar.cc/${size}?img=${img}`;
}
