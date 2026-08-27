import {
  EventCandidateT,
  MessageT,
  PlanT,
  RoomAvailabilityT,
  RoomMessageT,
  RoomPurposeT,
  RoomT,
  RoomVisibilityT,
  StampT,
  ThreadSummaryT,
  ThreadT,
  TimeProposalT,
  UserT,
} from "./types";

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

/** The caller's inbox, most-recent-activity first. */
export async function fetchMyThreads(token: string): Promise<ThreadSummaryT[]> {
  const res = await fetch(`${API_BASE}/threads`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`fetchMyThreads failed: ${res.status}`);
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

/** Signs in as the seeded demo account. 404s unless the backend has demo login
 *  enabled, so it's only surfaced behind NEXT_PUBLIC_DEMO_LOGIN_ENABLED. */
export async function demoLogin(): Promise<{ access_token: string; user: UserT }> {
  const res = await fetch(`${API_BASE}/auth/demo-login`, { method: "POST" });
  if (!res.ok) throw new Error((await res.json()).detail ?? "Demo login failed");
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

export async function createRoom(
  input: {
    name: string;
    purpose: RoomPurposeT;
    visibility: RoomVisibilityT;
    lat?: number;
    lon?: number;
  },
  token: string,
): Promise<RoomT> {
  const res = await fetch(`${API_BASE}/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`createRoom failed: ${res.status}`);
  return res.json();
}

/** Returns public rooms plus private rooms the caller belongs to. Rooms with no
 *  coordinates are "anywhere nearby" and always come back, regardless of radius. */
export async function fetchNearbyRooms(
  lat: number, lon: number, radiusM: number, token: string,
): Promise<RoomT[]> {
  const url = new URL(`${API_BASE}/rooms`);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("radius_m", String(radiusM));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`fetchNearbyRooms failed: ${res.status}`);
  return res.json();
}

export async function fetchRoom(id: string, token: string): Promise<RoomT> {
  const res = await fetch(`${API_BASE}/rooms/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`fetchRoom failed: ${res.status}`);
  return res.json();
}

/** Public rooms only — private rooms are joined by an existing member adding you. */
export async function joinRoom(id: string, token: string): Promise<RoomT> {
  const res = await fetch(`${API_BASE}/rooms/${id}/join`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`joinRoom failed: ${res.status}`);
  return res.json();
}

export async function addRoomMember(id: string, userId: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/rooms/${id}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ user_id: userId }),
  });
  if (!res.ok) throw new Error(`addRoomMember failed: ${res.status}`);
}

export async function leaveRoom(id: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/rooms/${id}/leave`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`leaveRoom failed: ${res.status}`);
}

/** Oldest-first, with each card's plan/proposal inlined. Members only. */
export async function fetchRoomMessages(id: string, token: string): Promise<RoomMessageT[]> {
  const res = await fetch(`${API_BASE}/rooms/${id}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`fetchRoomMessages failed: ${res.status}`);
  return res.json();
}

/** Text only — `plan_share` and `time_proposal` cards are written server-side
 *  by the endpoints that create the thing they point at. */
export async function postRoomMessage(
  id: string, body: string, token: string,
): Promise<RoomMessageT> {
  const res = await fetch(`${API_BASE}/rooms/${id}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ kind: "text", body }),
  });
  if (!res.ok) throw new Error(`postRoomMessage failed: ${res.status}`);
  return res.json();
}

export async function fetchRoomProposals(id: string, token: string): Promise<TimeProposalT[]> {
  const res = await fetch(`${API_BASE}/rooms/${id}/proposals`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`fetchRoomProposals failed: ${res.status}`);
  return res.json();
}

/** Also writes the proposal's card into the room thread, server-side. */
export async function createRoomProposal(
  id: string,
  input: { starts_at: string; ends_at: string; body?: string },
  token: string,
): Promise<TimeProposalT> {
  const res = await fetch(`${API_BASE}/rooms/${id}/proposals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`createRoomProposal failed: ${res.status}`);
  return res.json();
}

/** Idempotent — confirming twice returns the same proposal. */
export async function confirmRoomProposal(
  id: string, proposalId: string, token: string,
): Promise<TimeProposalT> {
  const res = await fetch(`${API_BASE}/rooms/${id}/proposals/${proposalId}/confirm`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`confirmRoomProposal failed: ${res.status}`);
  return res.json();
}

/** Day boundaries come from the browser, like `fetchEventCandidates` — the
 *  server doesn't know the viewer's timezone. */
export async function fetchRoomAvailability(
  id: string, dayStart: string, dayEnd: string, token: string,
): Promise<RoomAvailabilityT> {
  const url = new URL(`${API_BASE}/rooms/${id}/availability`);
  url.searchParams.set("day_start", dayStart);
  url.searchParams.set("day_end", dayEnd);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`fetchRoomAvailability failed: ${res.status}`);
  return res.json();
}
