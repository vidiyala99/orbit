/** Signed-in app destinations. Tabs: Home · Events · Inbox.
 *  Person detail (`/people/:id`) is its own route — not nested under Inbox.
 *  Guest search lives under an Event: `/events/:id`. */

export const APP_HOME = "/home";
export const APP_EVENTS = "/events";
export const APP_INBOX = "/inbox";
/** @deprecated Prefer APP_EVENTS + /events/:id — kept for redirects. */
export const APP_ATTENDEES = "/attendees";

export function eventPath(id: string): string {
  return `${APP_EVENTS}/${encodeURIComponent(id)}`;
}

/** Person detail (Keep landing / next action). Own route; not a tab. */
export function personPath(
  id: string,
  opts?: { from?: "home" | "inbox" | "events"; eventId?: string },
): string {
  const base = `/people/${encodeURIComponent(id)}`;
  const params = new URLSearchParams();
  if (opts?.from === "home") params.set("from", "home");
  if (opts?.from === "events" && opts.eventId) {
    params.set("from", "events");
    params.set("event", opts.eventId);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function afterAuthPath(user: { onboarded_at?: string | null }): string {
  return user.onboarded_at ? APP_HOME : "/onboarding";
}

/** On unless explicitly set to "false". */
export function isDemoLoginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_LOGIN_ENABLED !== "false";
}
