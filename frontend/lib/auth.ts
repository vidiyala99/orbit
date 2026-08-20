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

export { COOKIE_NAME };
