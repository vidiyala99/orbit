import { EventCandidateT, UserT } from "./types";
import { resolveApiBase } from "./apiBase";

const API_BASE = resolveApiBase();

/** The backend's own User row for the current session, keyed off our self-issued JWT. */
export async function fetchMe(token: string): Promise<UserT> {
  const res = await fetch(`${API_BASE}/me`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`fetchMe failed: ${res.status}`);
  return res.json();
}

/** A plain browser-navigation target, not a `fetch` — the OAuth consent flow is a
 *  redirect chain, so the JWT rides along as a query param. */
export function calendarConnectUrl(token: string): string {
  return `${API_BASE}/me/calendar/connect?token=${encodeURIComponent(token)}`;
}

export async function disconnectCalendar(token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/me/calendar/disconnect`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`disconnectCalendar failed: ${res.status}`);
}

/** Day boundaries come from the browser because the server doesn't know the
 *  user's timezone. Backs the Luma/Meetup/Eventbrite guest-list sourcing story. */
export async function fetchEventCandidates(
  dayStart: string, dayEnd: string, token: string,
): Promise<{ connected: boolean; candidates: EventCandidateT[] }> {
  const url = new URL(`${API_BASE}/me/calendar/candidates`);
  url.searchParams.set("day_start", dayStart);
  url.searchParams.set("day_end", dayEnd);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`fetchEventCandidates failed: ${res.status}`);
  return res.json();
}

export async function joinWaitlist(email: string): Promise<void> {
  const res = await fetch(`${API_BASE}/waitlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error("Could not join waitlist");
}

export async function fetchWaitlistCount(): Promise<number> {
  const res = await fetch(`${API_BASE}/waitlist/count`);
  if (!res.ok) throw new Error("Could not fetch waitlist count");
  const body = await res.json();
  return body.count;
}

export async function signup(
  email: string, password: string,
): Promise<{ access_token: string; user: UserT }> {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error((await res.json()).detail ?? "Signup failed");
  return res.json();
}

export async function login(
  email: string, password: string,
): Promise<{ access_token: string; user: UserT }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error((await res.json()).detail ?? "Login failed");
  return res.json();
}

/** Signs in as the seeded demo account. 404s unless the backend has demo login
 *  enabled, so it's only surfaced behind NEXT_PUBLIC_DEMO_LOGIN_ENABLED. */
export async function demoLogin(
  location?: { lat: number; lon: number; city: string },
): Promise<{ access_token: string; user: UserT }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(`${API_BASE}/auth/demo-login`, {
      method: "POST",
      headers: location ? { "Content-Type": "application/json" } : undefined,
      body: location ? JSON.stringify(location) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error((await res.json()).detail ?? "Demo login failed");
    return res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Demo login timed out. Opening the local demo.");
    }
    throw err instanceof Error ? err : new Error("Demo login failed");
  } finally {
    clearTimeout(timer);
  }
}

export class ApiRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

/** Event guest list — same Person rows as GET /people?event_id=. */
export async function fetchEventGuests(eventId: string, token: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(`${API_BASE}/events/${encodeURIComponent(eventId)}/guests`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) throw new ApiRequestError(`fetchEventGuests failed: ${res.status}`, res.status);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** POST /sync-runs {source: fixture} — seeds demo people when the guest list is empty. */
export async function syncFixturePeople(token: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(`${API_BASE}/sync-runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ source: "fixture" }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) throw new ApiRequestError(`syncFixturePeople failed: ${res.status}`, res.status);
  } finally {
    clearTimeout(timer);
  }
}

/** POST /events/{event_id}/sync — recomputes guest_count from real Person
 *  rows and stamps synced_at to now; returns the updated EventOut. */
export async function syncEvent(eventId: string, token: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(`${API_BASE}/events/${encodeURIComponent(eventId)}/sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) throw new ApiRequestError(`syncEvent failed: ${res.status}`, res.status);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/request-password-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error("Could not request password reset");
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  if (!res.ok) throw new Error((await res.json()).detail ?? "Could not reset password");
}

export async function verifyEmail(token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) throw new Error((await res.json()).detail ?? "Could not verify email");
}

export async function exchangeGoogleCode(
  code: string,
): Promise<{ access_token: string; user: UserT }> {
  const res = await fetch(`${API_BASE}/auth/google/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error((await res.json()).detail ?? "Could not sign in with Google");
  return res.json();
}

export async function updateJobTarget(
  input: { target_role: string | null; target_industries: string[] | null },
  token: string,
): Promise<UserT> {
  const res = await fetch(`${API_BASE}/me/job-target`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error((await res.json()).detail ?? "Could not save job target");
  return res.json();
}

/** PATCH /people/{id} — used by the follow-up story deck for Skip
 *  (`{priority: "later"}`) and Follow up (`{followed_up_at: <iso now>}`). */
export async function patchPerson(
  personId: string,
  input: { priority?: "needs_you" | "high" | "later"; followed_up_at?: string },
  token: string,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(`${API_BASE}/people/${encodeURIComponent(personId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) throw new ApiRequestError(`patchPerson failed: ${res.status}`, res.status);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function startLumaConnect(
  body: { email: string; turnstile_token?: string },
  token: string,
): Promise<{ status: "code_sent"; email: string; message: string }> {
  const res = await fetch(`${API_BASE}/me/luma/connect/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(formatApiDetail(payload.detail, "Could not start Luma connect"));
  }
  return res.json();
}

function formatApiDetail(detail: unknown, fallback: string): string {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((d) => (typeof d === "string" ? d : d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : null))
      .filter(Boolean);
    if (parts.length) return parts.join("; ");
  }
  if (detail && typeof detail === "object" && "msg" in detail) {
    return String((detail as { msg: unknown }).msg);
  }
  return fallback;
}

export async function connectLuma(
  body:
    | { email: string; code: string }
    | { api_key: string }
    | { magic_link: string }
    | { email: string; password: string },
  token: string,
): Promise<UserT> {
  const res = await fetch(`${API_BASE}/me/luma/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(formatApiDetail(payload.detail, "Could not connect Luma"));
  }
  return res.json();
}

export async function disconnectLuma(token: string): Promise<UserT> {
  const res = await fetch(`${API_BASE}/me/luma/disconnect`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json()).detail ?? "Could not disconnect Luma");
  return res.json();
}

export async function syncLuma(token: string): Promise<{ events: number; people: number; connected: boolean }> {
  const res = await fetch(`${API_BASE}/me/luma/sync`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json()).detail ?? "Could not sync Luma");
  return res.json();
}

export async function submitOnboarding(
  input: {
    first_name: string;
    last_name: string;
    city: string;
    pain_points: string[];
    pain_point_other?: string;
  },
  token: string,
): Promise<UserT> {
  const res = await fetch(`${API_BASE}/me/onboarding`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error((await res.json()).detail ?? "Could not save profile");
  return res.json();
}
