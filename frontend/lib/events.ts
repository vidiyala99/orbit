import { ApiRequestError, demoLogin } from "./api";
import { resolveApiBase } from "./apiBase";
import { hasFocusSocialProof } from "./avatarCandidates";
import { getClientToken, setClientToken } from "./auth";
import { DEMO_OFFLINE_TOKEN } from "./demoFixtures";

export type EventT = {
  id: string;
  title: string;
  source_url: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  guest_count: number | null;
  synced_at: string | null;
  shortlist_count: number;
};

/** Keep Focus open after start — Luma often has no ends_at. */
const FOCUS_FALLBACK_MS = 6 * 60 * 60 * 1000;

export function eventFocusEndsAt(event: Pick<EventT, "starts_at" | "ends_at">): number {
  if (event.ends_at) {
    const end = new Date(event.ends_at).getTime();
    if (!Number.isNaN(end)) return end;
  }
  return new Date(event.starts_at).getTime() + FOCUS_FALLBACK_MS;
}

/** True while the Event is still in the Focus time window (upcoming or live). */
export function isFocusEvent(
  event: Pick<EventT, "starts_at" | "ends_at">,
  now = Date.now(),
): boolean {
  return now <= eventFocusEndsAt(event);
}

/** Build/demo: prefer the room we actually have guests for (latest sync). */
export function pickFeaturedEvent(events: EventT[]): EventT | null {
  const withGuests = events.filter((e) => (e.guest_count ?? 0) > 0);
  const pool = withGuests.length ? withGuests : events;
  if (!pool.length) return null;
  return [...pool].sort((a, b) => {
    const as = a.synced_at ? new Date(a.synced_at).getTime() : 0;
    const bs = b.synced_at ? new Date(b.synced_at).getTime() : 0;
    if (bs !== as) return bs - as;
    return new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime();
  })[0];
}

/** One person in the Home Focus-card queue (ranked, not yet triaged). */
export type PersonSummaryT = {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  priority: "needs_you" | "high" | "later";
  event_title: string;
  /** Days since the event started; 0 when the event is still upcoming. */
  event_ended_days_ago: number;
  /** True when the featured event hasn't started yet. */
  event_upcoming: boolean;
  why: string;
  note_payload: string | null;
  dm_payload: string | null;
  avatar_url?: string | null;
  score?: number | null;
  linkedin_url?: string | null;
  x_url?: string | null;
  /** Situational match tags from ranking / heuristics. */
  signals?: string[] | null;
  intent?: string | null;
  /** Luma bio / talk notes — not enrichment. */
  what_talked?: string | null;
  note?: string | null;
  evidence?: { source_id: string; quote: string }[] | null;
};

export type InboxPersonT = {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  why: string;
  avatar_url: string | null;
  event_title: string;
  triaged_at: string | null;
  /** Demo/sample address for mailto draft. */
  email: string;
  /** Longer follow-up email body. */
  email_body: string;
  /** Short DM body. */
  dm_body: string;
};

/** One row on the Attendees search list — every guest on the featured Event. */
export type AttendeeListItemT = {
  id: string;
  name: string;
  role: string;
  why: string;
  priority: "needs_you" | "high" | "later";
  score: number | null;
  avatar_url: string | null;
  linkedin_url: string | null;
  x_url: string | null;
  triage_state: string | null;
};

export type AttendeesDataT = {
  event: {
    id: string;
    title: string;
    location: string | null;
    guest_count: number | null;
  } | null;
  attendees: AttendeeListItemT[];
};

export type JobTargetT = {
  targetRole: string | null;
  targetIndustries: string[] | null;
};

export type HomeDataT = {
  upcoming: EventT[];
  past: EventT[];
  /** All synced events (for Events list / empty Home). */
  events: EventT[];
  /** Ranked Attendees still waiting on Keep/Skip for the featured event. */
  reviewQueue: PersonSummaryT[];
  /** Inbox people for catch-up when Focus is empty. */
  catchUp: InboxPersonT[];
  inboxCount: number;
  lastSyncedAt: string | null;
  featuredEvent: { id: string; title: string; location: string | null } | null;
  jobTarget: JobTargetT;
  lumaConnected: boolean;
};

const EMPTY_HOME: HomeDataT = {
  upcoming: [],
  past: [],
  events: [],
  reviewQueue: [],
  catchUp: [],
  inboxCount: 0,
  lastSyncedAt: null,
  featuredEvent: null,
  jobTarget: { targetRole: null, targetIndustries: null },
  lumaConnected: false,
};

async function existingSessionToken(): Promise<string | null> {
  if (typeof document !== "undefined") return getClientToken();
  try {
    const { cookies } = await import("next/headers");
    return (await cookies()).get("sc_token")?.value ?? null;
  } catch {
    return null;
  }
}

async function resolveToken(existing: string | null): Promise<string | null> {
  if (existing && existing !== DEMO_OFFLINE_TOKEN) return existing;
  try {
    const { access_token } = await demoLogin();
    if (typeof document !== "undefined") setClientToken(access_token);
    return access_token;
  } catch {
    return null;
  }
}

/** Same 401 → demo-login recovery Home already uses — Events/Inbox must too. */
async function withAuthRetry<T>(run: (token: string) => Promise<T>, fallback: T): Promise<T> {
  let token = await resolveToken(await existingSessionToken());
  if (!token) return fallback;
  try {
    return await run(token);
  } catch (err) {
    const unauthorized = err instanceof ApiRequestError && err.status === 401;
    if (!unauthorized) return fallback;
    try {
      token = await resolveToken(null);
      if (!token) return fallback;
      return await run(token);
    } catch {
      return fallback;
    }
  }
}

async function fetchJson(path: string, token: string): Promise<unknown> {
  const res = await fetch(`${resolveApiBase()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new ApiRequestError(await res.text(), res.status);
  return res.json();
}

function splitName(name: string): { first_name: string; last_name: string } {
  const parts = name.trim().split(/\s+/);
  return { first_name: parts[0] ?? "", last_name: parts.slice(1).join(" ") };
}

function daysAgo(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

type RawGuest = {
  id: string;
  name: string;
  role: string | null;
  score: number | null;
  relevance: string | null;
  priority: string | null;
  avatar_url: string | null;
  linkedin_url: string | null;
  x_url: string | null;
  intent: string | null;
  signals: string[] | null;
  triage_state: string | null;
  note_payload: string | null;
  dm_payload: string | null;
  what_talked: string | null;
  note: string | null;
  evidence: { source_id: string; quote: string }[] | null;
};
type RawInbox = {
  id: string;
  name: string;
  role: string | null;
  relevance: string | null;
  avatar_url: string | null;
  event_id: string | null;
  triaged_at: string | null;
  email: string | null;
  note_payload: string | null;
  dm_payload: string | null;
  email_draft: string | null;
};
type RawMe = { target_role: string | null; target_industries: string[] | null; luma_connected: boolean };

async function fetchReviewQueue(
  token: string,
  event: EventT,
): Promise<PersonSummaryT[]> {
  const guests = (await fetchJson(`/events/${event.id}/guests`, token)) as RawGuest[];
  const upcoming = new Date(event.starts_at).getTime() > Date.now();
  const undecided = guests
    .filter((g) => !g.triage_state && (g.priority === "needs_you" || g.priority === "high"))
    .filter((g) =>
      hasFocusSocialProof({ avatar_url: g.avatar_url, linkedin_url: g.linkedin_url }),
    )
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return undecided.map((p) => {
    const split = splitName(p.name);
    return {
      id: p.id,
      first_name: split.first_name,
      last_name: split.last_name,
      role: p.role ?? "",
      priority: (p.priority as PersonSummaryT["priority"]) ?? "later",
      event_title: event.title,
      event_ended_days_ago: upcoming ? 0 : daysAgo(event.starts_at),
      event_upcoming: upcoming,
      why: p.relevance ?? "",
      note_payload: p.note_payload,
      dm_payload: p.dm_payload,
      avatar_url: p.avatar_url,
      score: p.score,
      linkedin_url: p.linkedin_url,
      x_url: p.x_url,
      signals: p.signals ?? null,
      intent: p.intent ?? null,
      what_talked: p.what_talked ?? null,
      note: p.note ?? null,
      evidence: p.evidence ?? null,
    };
  });
}

async function fetchHomeData(token: string): Promise<HomeDataT> {
  // Inbox is additive — a missing/failed /inbox must not blank the whole Home
  // (that was wiping a loaded guest room behind "0 synced / never").
  const [events, me, inbox] = await Promise.all([
    fetchJson("/events", token) as Promise<EventT[]>,
    fetchJson("/me", token) as Promise<RawMe>,
    fetchJson("/inbox", token)
      .then((rows) => rows as RawInbox[])
      .catch(() => [] as RawInbox[]),
  ]);
  const jobTarget: JobTargetT = {
    targetRole: me.target_role ?? null,
    targetIndustries: me.target_industries ?? null,
  };
  const lumaConnected = me.luma_connected ?? false;
  const now = Date.now();
  const upcoming = events
    .filter((e) => isFocusEvent(e, now))
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  const past = events
    .filter((e) => !isFocusEvent(e, now))
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

  const lastSyncedAt = events
    .map((e) => e.synced_at)
    .filter((s): s is string => !!s)
    .sort()
    .at(-1) ?? null;

  const featured = pickFeaturedEvent(events);
  const reviewQueue = featured ? await fetchReviewQueue(token, featured) : [];
  const featuredEvent = featured
    ? { id: featured.id, title: featured.title, location: featured.location ?? null }
    : null;

  const eventById = new Map(events.map((e) => [e.id, e]));
  const catchUp = mapInboxPeople(inbox, eventById);

  return {
    upcoming,
    past,
    events,
    reviewQueue,
    catchUp,
    inboxCount: inbox.length,
    lastSyncedAt,
    featuredEvent,
    jobTarget,
    lumaConnected,
  };
}

export async function loadHomeData(): Promise<HomeDataT> {
  return withAuthRetry((token) => fetchHomeData(token), EMPTY_HOME);
}

function mapInboxPeople(inbox: RawInbox[], eventById: Map<string, EventT>): InboxPersonT[] {
  return inbox.map((p) => {
    const split = splitName(p.name);
    const eventTitle = (p.event_id && eventById.get(p.event_id)?.title) || "";
    const why = p.relevance ?? "";
    const email =
      p.email?.trim() ||
      `${split.first_name}.${split.last_name || "guest"}@orbit.demo`
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/\.+/g, ".");
    const emailBody =
      p.email_draft?.trim() ||
      p.note_payload?.trim() ||
      [
        `Hi ${split.first_name},`,
        "",
        eventTitle
          ? `Great meeting you at ${eventTitle}.`
          : "Great connecting with you.",
        why ? `${why}` : "Would love to keep the conversation going.",
        "",
        "Free for a quick chat next week?",
      ].join("\n");
    const dmBody =
      p.dm_payload?.trim() ||
      [
        `Hey ${split.first_name} —`,
        eventTitle ? `enjoyed meeting you at ${eventTitle}.` : "great meeting you.",
        why ? why : "Would love to stay in touch.",
      ].join(" ");
    return {
      id: p.id,
      first_name: split.first_name,
      last_name: split.last_name,
      role: p.role ?? "",
      why,
      avatar_url: p.avatar_url,
      event_title: eventTitle,
      triaged_at: p.triaged_at,
      email,
      email_body: emailBody,
      dm_body: dmBody,
    };
  });
}

export async function loadInbox(): Promise<InboxPersonT[]> {
  return withAuthRetry(async (token) => {
    const [inbox, events] = await Promise.all([
      fetchJson("/inbox", token) as Promise<RawInbox[]>,
      fetchJson("/events", token) as Promise<EventT[]>,
    ]);
    const eventById = new Map(events.map((e) => [e.id, e]));
    return mapInboxPeople(inbox, eventById);
  }, []);
}

export async function loadEvents(): Promise<EventT[]> {
  return withAuthRetry(async (token) => {
    const events = (await fetchJson("/events", token)) as EventT[];
    return [...events].sort((a, b) => {
      const as = a.synced_at ? new Date(a.synced_at).getTime() : 0;
      const bs = b.synced_at ? new Date(b.synced_at).getTime() : 0;
      if (bs !== as) return bs - as;
      return new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime();
    });
  }, []);
}

async function guestsForEvent(token: string, event: EventT): Promise<AttendeeListItemT[]> {
  const guests = (await fetchJson(`/events/${event.id}/guests`, token)) as RawGuest[];
  return guests
    .map((g) => ({
      id: g.id,
      name: g.name,
      role: g.role ?? "",
      why: g.relevance ?? "",
      priority: (g.priority as AttendeeListItemT["priority"]) ?? "later",
      score: g.score,
      avatar_url: g.avatar_url,
      linkedin_url: g.linkedin_url,
      x_url: g.x_url,
      triage_state: g.triage_state,
    }))
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}

/** Guests for one Event (Events tab detail). */
export async function loadEventAttendees(eventId: string): Promise<AttendeesDataT> {
  const empty: AttendeesDataT = { event: null, attendees: [] };
  return withAuthRetry(async (token) => {
    const events = (await fetchJson("/events", token)) as EventT[];
    const event = events.find((e) => e.id === eventId) ?? null;
    if (!event) return empty;
    const attendees = await guestsForEvent(token, event);
    return {
      event: {
        id: event.id,
        title: event.title,
        location: event.location ?? null,
        guest_count: event.guest_count ?? attendees.length,
      },
      attendees,
    };
  }, empty);
}

/** Every guest on the featured Event — not Focus-shortlist only. */
export async function loadAttendees(): Promise<AttendeesDataT> {
  const empty: AttendeesDataT = { event: null, attendees: [] };
  return withAuthRetry(async (token) => {
    const events = (await fetchJson("/events", token)) as EventT[];
    const featured = pickFeaturedEvent(events);
    if (!featured) return empty;
    const attendees = await guestsForEvent(token, featured);
    return {
      event: {
        id: featured.id,
        title: featured.title,
        location: featured.location ?? null,
        guest_count: featured.guest_count ?? attendees.length,
      },
      attendees,
    };
  }, empty);
}
