/** Public Render API. Production builds must never fall back to localhost —
 *  that makes Chrome ask to “access other apps and services on this device”
 *  (Private Network Access) when the Vercel origin fetches 127.0.0.1. */
export const PRODUCTION_API_BASE = "https://orbit-api-a8ed.onrender.com";

function isPrivateOrLocalhost(url: string): boolean {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|\.local(?:[:/]|$)/i.test(url);
}

function stripSlash(url: string): string {
  return url.replace(/\/$/, "");
}

export function resolveApiBase(
  fromEnv: string | undefined = process.env.NEXT_PUBLIC_API_BASE,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): string {
  const configured = stripSlash((fromEnv ?? "").trim());
  const isProd = nodeEnv === "production";
  if (isProd) {
    if (configured && !isPrivateOrLocalhost(configured)) return configured;
    return PRODUCTION_API_BASE;
  }
  if (configured) return configured;
  return "http://localhost:8001";
}
