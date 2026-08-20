import { MessageT, PlanT, StampT, ThreadT, UserT } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

/** The backend's own User row for the current Clerk session. Its `id` — not the
 *  Clerk user id — is what `Message.sender_id` references. */
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
  email: string, password: string, name: string,
): Promise<{ access_token: string; user: UserT }> {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
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

export async function createPlan(
  input: { text: string; lat: number; lon: number; starts_at: string; ends_at: string },
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
