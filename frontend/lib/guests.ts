import { ApiRequestError, demoLogin, fetchEventGuests, syncFixturePeople } from "./api";
import { getClientToken, setClientToken } from "./auth";
import { DEMO_OFFLINE_TOKEN, FIXTURE_ATTENDEES, FIXTURE_EVENT, fixtureAttendee } from "./demoFixtures";
import { compose_dm_payload, compose_note_payload } from "./contactCopy";
import type { AttendeePriorityT, AttendeeT, ContactNoteT, EventBriefT } from "./types";

/** Opaque event id Engine seeds for the demo guest list. */
export const DEMO_EVENT_ID = "burning-token";

export const LIVE_EVENT: EventBriefT = {
  id: DEMO_EVENT_ID,
  title: "Burning Token",
  datetime: "Sat",
};

export type DeskGuests = {
  event: EventBriefT;
  attendees: AttendeeT[];
  source: "live" | "fallback";
};

const PRIORITIES = new Set<AttendeePriorityT>(["needs_you", "high", "later"]);

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function pick(raw: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (raw[key] !== undefined && raw[key] !== null) return raw[key];
  }
  return undefined;
}

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function asBool(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function splitName(name: string): { first_name: string; last_name: string } {
  const parts = name.trim().split(/\s+/);
  const first_name = parts[0] ?? "";
  const last_name = parts.slice(1).join(" ");
  return { first_name, last_name };
}

function guestsArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const rec = asRecord(payload);
  if (!rec) return [];
  for (const key of ["guests", "people", "attendees"]) {
    if (Array.isArray(rec[key])) return rec[key];
  }
  return [];
}

function contactNote(raw: Record<string, unknown>, firstName: string): ContactNoteT {
  const nested = asRecord(pick(raw, "note"));
  const where_met =
    asString(pick(raw, "where_met", "whereMet")) ??
    asString(nested ? pick(nested, "where_met", "whereMet") : undefined) ??
    "";
  const what_talked =
    asString(pick(raw, "what_talked", "whatTalked")) ??
    asString(nested ? pick(nested, "what_talked", "whatTalked") : undefined) ??
    "";
  const why =
    asString(pick(raw, "relevance", "why_meet", "whyMeet", "why")) ??
    asString(nested ? pick(nested, "why", "relevance") : undefined) ??
    "";
  if (where_met || what_talked || why) {
    return { where_met, what_talked, why };
  }
  return {
    where_met: "",
    what_talked: "",
    why: asString(pick(raw, "note")) ?? firstName,
  };
}

function evidenceOf(value: unknown): AttendeeT["evidence"] {
  if (!Array.isArray(value)) return [];
  const out: AttendeeT["evidence"] = [];
  for (const item of value) {
    const rec = asRecord(item);
    if (!rec) continue;
    const source_id = asString(pick(rec, "source_id", "sourceId"));
    const quote = asString(pick(rec, "quote"));
    if (source_id && quote) out.push({ source_id, quote });
  }
  return out;
}

function priorityOf(value: unknown): AttendeePriorityT {
  return typeof value === "string" && PRIORITIES.has(value as AttendeePriorityT)
    ? (value as AttendeePriorityT)
    : "later";
}

/** Thin Person / guest JSON → desk AttendeeT. Tolerates alias keys. */
export function mapGuestToAttendee(raw: unknown): AttendeeT | null {
  const rec = asRecord(raw);
  if (!rec) return null;

  const id = asString(pick(rec, "id"));
  if (!id) return null;

  const fullName = asString(pick(rec, "name"));
  const firstFromField = asString(pick(rec, "first_name", "firstName"));
  const lastFromField = asString(pick(rec, "last_name", "lastName")) ?? "";
  const split = fullName ? splitName(fullName) : null;
  const first_name = firstFromField ?? split?.first_name ?? "";
  const last_name = firstFromField !== null ? lastFromField : (split?.last_name ?? "");
  if (!first_name) return null;

  const note = contactNote(rec, first_name);
  const source = { first_name, note };
  const notePayload = asString(pick(rec, "note_payload", "notePayload")) ?? compose_note_payload(source);
  const dmPayload = asString(pick(rec, "dm_payload", "dmPayload")) ?? compose_dm_payload(source);

  return {
    id,
    first_name,
    last_name,
    role: asString(pick(rec, "role")) ?? "",
    linkedin_url: asString(pick(rec, "linkedin_url", "linkedinUrl")) ?? "",
    x_url: asString(pick(rec, "x_url", "xUrl")) ?? "",
    website_url: asString(pick(rec, "website_url", "websiteUrl")),
    why_meet: asString(pick(rec, "relevance", "why_meet", "whyMeet")) ?? note.why,
    avatar_url: asString(pick(rec, "avatar_url", "avatarUrl")),
    priority: priorityOf(pick(rec, "priority")),
    linkedin_connected: asBool(pick(rec, "linkedin_connected", "linkedinConnected")),
    x_interacted: asBool(pick(rec, "x_interacted", "xInteracted")),
    note,
    note_payload: notePayload,
    dm_payload: dmPayload,
    evidence: evidenceOf(pick(rec, "evidence")),
  };
}

export function guestsFromResponse(payload: unknown): AttendeeT[] {
  const rows: AttendeeT[] = [];
  for (const item of guestsArray(payload)) {
    const mapped = mapGuestToAttendee(item);
    if (mapped) rows.push(mapped);
  }
  return rows;
}

function fallbackDesk(): DeskGuests {
  return { event: FIXTURE_EVENT, attendees: FIXTURE_ATTENDEES, source: "fallback" };
}

function persistToken(token: string) {
  if (typeof document === "undefined") return;
  setClientToken(token);
}

async function existingSessionToken(): Promise<string | null> {
  if (typeof document !== "undefined") return getClientToken();
  try {
    const { cookies } = await import("next/headers");
    return (await cookies()).get("sc_token")?.value ?? null;
  } catch {
    return null;
  }
}

async function resolveGuestsToken(existing: string | null): Promise<string | null> {
  if (existing && existing !== DEMO_OFFLINE_TOKEN) return existing;
  try {
    const { access_token } = await demoLogin();
    persistToken(access_token);
    return access_token;
  } catch {
    return null;
  }
}

async function fetchMappedGuests(token: string): Promise<AttendeeT[]> {
  const payload = await fetchEventGuests(DEMO_EVENT_ID, token);
  let attendees = guestsFromResponse(payload);
  if (attendees.length > 0) return attendees;

  await syncFixturePeople(token);
  attendees = guestsFromResponse(await fetchEventGuests(DEMO_EVENT_ID, token));
  return attendees;
}

export async function loadDeskGuests(): Promise<DeskGuests> {
  let token = await resolveGuestsToken(await existingSessionToken());
  if (!token) return fallbackDesk();

  try {
    const attendees = await fetchMappedGuests(token);
    if (attendees.length === 0) return fallbackDesk();
    return { event: LIVE_EVENT, attendees, source: "live" };
  } catch (err) {
    const unauthorized = err instanceof ApiRequestError && err.status === 401;
    if (unauthorized) {
      try {
        token = await resolveGuestsToken(null);
        if (!token) return fallbackDesk();
        const attendees = await fetchMappedGuests(token);
        if (attendees.length === 0) return fallbackDesk();
        return { event: LIVE_EVENT, attendees, source: "live" };
      } catch {
        return fallbackDesk();
      }
    }
    return fallbackDesk();
  }
}

export function findDeskAttendee(id: string, attendees: AttendeeT[]): AttendeeT | undefined {
  return attendees.find((row) => row.id === id) ?? fixtureAttendee(id);
}
