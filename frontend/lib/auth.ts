const COOKIE_NAME = "sc_token";
const MAX_AGE_SECONDS = 7 * 24 * 3600;

export function getClientToken(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setClientToken(token: string): void {
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax${secure}`;
}

export function clearClientToken(): void {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}

/**
 * Client components need a readable cookie. Home often demo-logs in on the
 * server without writing `sc_token` to the browser — mint one here if missing.
 */
export async function ensureClientToken(): Promise<string | null> {
  const existing = getClientToken();
  if (existing) return existing;
  try {
    const { demoLogin } = await import("./api");
    const { access_token } = await demoLogin();
    setClientToken(access_token);
    return access_token;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
