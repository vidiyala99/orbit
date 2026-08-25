import { EventCandidateT, MessageT, PlanT, StampT, ThreadT, UserT } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

/** The backend's own User row for the current session, keyed off our self-issued
 *  JWT. Its `id` is what `Message.sender_id` references. */
export async function fetchMe(token: string): Promise<UserT> {
  const res = await fetch(`${API_BASE}/me`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`fetchMe failed: ${res.status}`);
  return res.json();
}

/** Discovery is public — `token` is optional and, when present, only used to
 *  personalize results (e.g. hiding plans from blocked users). */
export async function fetchNearbyPlans(
  lat: number, lon: number, radiusM: number, at: string, token?: string,
): Promise<PlanT[]> {
  const url = new URL(`${API_BASE}/plans`);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("radius_m", String(radiusM));
  url.searchParams.set("at", at);

  const res = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`fetchNearbyPlans failed: ${res.status}`);
  return res.json();
}

export async function fetchPlan(id: string, token?: string): Promise<PlanT> {
  const res = await fetch(`${API_BASE}/plans/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`fetchPlan failed: ${res.status}`);
  return res.json();
}

export async function startThread(otherUserId: string, token: string): Promise<ThreadT> {
  const res = await fetch(`${API_BASE}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ other_user_id: otherUserId }),
  });
  if (!res.ok) throw new Error(`startThread failed: ${res.status}`);
  return res.json();
}

export async function fetchMessages(threadId: string, token: string): Promise<MessageT[]> {
  const res = await fetch(`${API_BASE}/threads/${threadId}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`fetchMessages failed: ${res.status}`);
  return res.json();
}

export async function confirmStamp(threadId: string, token: string): Promise<StampT> {
  const res = await fetch(`${API_BASE}/threads/${threadId}/stamp`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`confirmStamp failed: ${res.status}`);
  return res.json();
}

export function wsUrl(threadId: string, token: string): string {
  const base = API_BASE.replace(/^http/, "ws");
  return `${base}/ws/threads/${threadId}?token=${encodeURIComponent(token)}`;
}

/** A plain browser-navigation target, not a `fetch` — the OAuth consent flow is a
 *  redirect chain, so the JWT rides along as a query param like `wsUrl` does. */
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
 *  user's timezone — same reasoning as geolocation on `/post`. */
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

export async function createPlan(
  input: {
    activity: string;
    openness: string;
    detail?: string | null;
    lat: number;
    lon: number;
    starts_at: string;
    ends_at: string;
  },
  token: string,
): Promise<PlanT> {
  const res = await fetch(`${API_BASE}/plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`createPlan failed: ${res.status}`);
  return res.json();
}
