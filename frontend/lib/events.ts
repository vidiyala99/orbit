import { ApiRequestError, demoLogin } from "./api";
import { resolveApiBase } from "./apiBase";
import { getClientToken, setClientToken } from "./auth";
import { DEMO_OFFLINE_TOKEN } from "./demoFixtures";
import { computeJobRelevanceBoost, type BoostReason } from "./jobRelevance";

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

export type PersonSummaryT = {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  priority: "needs_you" | "high" | "later";
  event_title: string;
  event_ended_days_ago: number;
  /** The "why" behind this person, straight from Person.relevance — empty
   *  string when the backend has nothing (no invented copy). */
  why: string;
  note_payload: string | null;
  dm_payload: string | null;
};

export type ShortlistPersonT = {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  score: number | null;
  why: string;
  avatar_url: string | null;
  intent: string | null;
  /** Why this person's rank was boosted above their plain `score`, or null
   *  when they weren't boosted (still shown, just unboosted). */
  boostReason?: BoostReason | null;
};

export type JobTargetT = {
  targetRole: string | null;
  targetIndustries: string[] | null;
};

export type HomeDataT = {
  upcoming: EventT[];
  past: EventT[];
  needsFollowUp: PersonSummaryT[];
  lastSyncedAt: string | null;
  /** The nearest upcoming event's ranked shortlist, or null when there is
   *  no upcoming event to rank guests for. */
  featuredEvent: { id: string; title: string } | null;
  topShortlist: ShortlistPersonT[];
  shortlistTotal: number;
  /** The user's stated job search target — drives shortlist re-ranking and
   *  the editable "Looking for: ..." row on Home. */
  jobTarget: JobTargetT;
  /** Whether the user's Luma account is currently connected. */
  lumaConnected: boolean;
};

const EMPTY_HOME: HomeDataT = {
  upcoming: [],
  past: [],
  needsFollowUp: [],
  lastSyncedAt: null,
  featuredEvent: null,
  topShortlist: [],
  shortlistTotal: 0,
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

type RawFollowUp = {
  id: string;
  name: string;
  role: string | null;
  priority: string;
  event_id: string;
  relevance: string | null;
  note_payload: string | null;
  dm_payload: string | null;
};
type RawGuest = {
  id: string;
  name: string;
  role: string | null;
  score: number | null;
  relevance: string | null;
  priority: string | null;
  avatar_url: string | null;
  intent: string | null;
};
type RawMe = { target_role: string | null; target_industries: string[] | null; luma_connected: boolean };

async function fetchShortlist(
  token: string,
  eventId: string,
  targetRole: string | null,
  targetIndustries: string[] | null,
): Promise<{ topShortlist: ShortlistPersonT[]; shortlistTotal: number }> {
  const guests = (await fetchJson(`/events/${eventId}/guests`, token)) as RawGuest[];
  const shortlisted = guests.filter((g) => g.priority === "needs_you");

  // Job-search re-ranking: the backend's `score` is a generic relevance
  // signal, but the user's only goal here is landing a job, so people who
  // can actually move that forward (hiring power > topical relevance >
  // warm-intro proxy) sort above people who merely scored well. Nobody is
  // hidden — an unboosted person keeps their plain `score` order, which
  // naturally sinks them below boosted matches.
  const ranked = shortlisted
    .map((p) => {
      const { boost, reason } = computeJobRelevanceBoost(p, targetRole, targetIndustries);
      return { guest: p, reason, effectiveScore: (p.score ?? 0) + boost };
    })
    .sort(
      (a, b) => b.effectiveScore - a.effectiveScore || (b.guest.score ?? 0) - (a.guest.score ?? 0),
    );

  const topShortlist = ranked.map(({ guest: p, reason }) => {
    const split = splitName(p.name);
    return {
      id: p.id,
      first_name: split.first_name,
      last_name: split.last_name,
      role: p.role ?? "",
      score: p.score,
      why: p.relevance ?? "",
      avatar_url: p.avatar_url,
      intent: p.intent,
      boostReason: reason,
    };
  });
  return { topShortlist, shortlistTotal: shortlisted.length };
}

async function fetchHomeData(token: string): Promise<HomeDataT> {
  const [events, followUps, me] = await Promise.all([
    fetchJson("/events", token) as Promise<EventT[]>,
    fetchJson("/people/needs-follow-up", token) as Promise<RawFollowUp[]>,
    fetchJson("/me", token) as Promise<RawMe>,
  ]);
  const jobTarget: JobTargetT = {
    targetRole: me.target_role ?? null,
    targetIndustries: me.target_industries ?? null,
  };
  const lumaConnected = me.luma_connected ?? false;
  const now = Date.now();
  const upcoming = events
    .filter((e) => new Date(e.starts_at).getTime() > now)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  const past = events
    .filter((e) => new Date(e.starts_at).getTime() <= now)
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
  const eventById = new Map(events.map((e) => [e.id, e]));

  const needsFollowUp: PersonSummaryT[] = followUps.map((p) => {
    const event = eventById.get(p.event_id);
    const split = splitName(p.name);
    return {
      id: p.id,
      first_name: split.first_name,
      last_name: split.last_name,
      role: p.role ?? "",
      priority: (p.priority as PersonSummaryT["priority"]) ?? "later",
      event_title: event?.title ?? "",
      event_ended_days_ago: event ? daysAgo(event.starts_at) : 0,
      why: p.relevance ?? "",
      note_payload: p.note_payload,
      dm_payload: p.dm_payload,
    };
  });

  const lastSyncedAt = events
    .map((e) => e.synced_at)
    .filter((s): s is string => !!s)
    .sort()
    .at(-1) ?? null;

  const nearest = upcoming[0] ?? null;
  const { topShortlist, shortlistTotal } = nearest
    ? await fetchShortlist(token, nearest.id, jobTarget.targetRole, jobTarget.targetIndustries)
    : { topShortlist: [], shortlistTotal: 0 };
  const featuredEvent = nearest ? { id: nearest.id, title: nearest.title } : null;

  return { upcoming, past, needsFollowUp, lastSyncedAt, featuredEvent, topShortlist, shortlistTotal, jobTarget, lumaConnected };
}

export async function loadHomeData(): Promise<HomeDataT> {
  let token = await resolveToken(await existingSessionToken());
  if (!token) return EMPTY_HOME;
  try {
    return await fetchHomeData(token);
  } catch (err) {
    const unauthorized = err instanceof ApiRequestError && err.status === 401;
    if (!unauthorized) return EMPTY_HOME;
    try {
      token = await resolveToken(null);
      if (!token) return EMPTY_HOME;
      return await fetchHomeData(token);
    } catch {
      return EMPTY_HOME;
    }
  }
}
