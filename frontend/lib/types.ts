export type UserT = {
  id: string;
  email: string;
  email_verified_at: string | null;
  headline: string | null;
  linkedin_url: string | null;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  lat: number | null;
  lon: number | null;
  pain_points: string[] | null;
  pain_point_other: string | null;
  onboarded_at: string | null;
  google_calendar_connected: boolean;
};

/** Something the user might be attending today, as returned by
 *  `/me/calendar/candidates`. Gmail-sourced candidates carry a title only —
 *  email bodies aren't parsed for time/location. */
export type EventCandidateT = {
  source: "calendar" | "gmail";
  title: string;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
};

export type PlanT = {
  id: string;
  user_id: string;
  activity: string;
  openness: string;
  detail: string | null;
  /** Server-assembled display sentence. */
  text: string;
  lat: number;
  lon: number;
  starts_at: string;
  ends_at: string;
};

export type RoomPurposeT = "cowork" | "coffee_chat" | "study_group" | "job_hunting" | "other";

export type RoomVisibilityT = "public" | "private";

/** A standing group people can join, as returned by `/rooms`. A room with a
 *  null `lat`/`lon` isn't pinned anywhere — it shows up for everyone nearby. */
export type RoomT = {
  id: string;
  creator_id: string;
  name: string;
  purpose: RoomPurposeT;
  visibility: RoomVisibilityT;
  lat: number | null;
  lon: number | null;
  created_at: string;
  member_count: number;
  is_member: boolean;
};

/** One member's "yes" on a proposal. Keyed on membership server-side, but the
 *  API resolves `user_id` too so the UI can mark who's in without a lookup. */
export type TimeProposalConfirmationT = {
  id: string;
  proposal_id: string;
  room_member_id: string;
  user_id: string;
  confirmed_at: string;
};

/** A time someone floated for a room. `status` flips to "confirmed" only once
 *  every current member has confirmed — `member_count` is what that has to reach. */
export type TimeProposalT = {
  id: string;
  room_id: string;
  proposer_id: string;
  starts_at: string;
  ends_at: string;
  status: "proposed" | "confirmed";
  confirmed_at: string | null;
  created_at: string;
  confirmations: TimeProposalConfirmationT[];
  member_count: number;
  confirmed_by_me: boolean;
};

/** A room-thread message. `kind` discriminates a plain bubble from a card; the
 *  referenced plan/proposal comes inlined, so a card renders without a refetch.
 *  Clients may only post "text" — a "time_proposal" card is written server-side
 *  when the proposal is created. */
export type RoomMessageT = {
  id: string;
  room_id: string;
  sender_id: string;
  kind: "text" | "plan_share" | "time_proposal";
  body: string | null;
  plan_id: string | null;
  time_proposal_id: string | null;
  created_at: string;
  plan: PlanT | null;
  time_proposal: TimeProposalT | null;
};

export type BusyBlockT = { starts_at: string; ends_at: string };

/** `connected: false` means the member never linked Google Calendar (or the
 *  grant died) — they're unknown for the day, not free. */
export type MemberAvailabilityT = {
  user_id: string;
  connected: boolean;
  busy: BusyBlockT[];
};

export type RoomAvailabilityT = { members: MemberAvailabilityT[] };

export type ThreadT = { id: string; user_a_id: string; user_b_id: string };

export type MessageT = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

/** One row of the chats inbox, as returned by `GET /threads`: the thread plus
 *  the other participant and the latest message. `last_message` is null for a
 *  thread that was started but never written in. */
export type ThreadSummaryT = {
  id: string;
  other_user: Pick<UserT, "id" | "first_name" | "last_name" | "avatar_url">;
  last_message: { id: string; sender_id: string; body: string; created_at: string } | null;
};

export type StampT = { confirmed: boolean; confirmed_at: string | null };

export type PresenceT = {
  id: string;
  user_id: string;
  lat: number;
  lon: number;
  started_at: string;
  expires_at: string;
};

/** One ranked row from `GET /presence/nearby`: a nearby, currently-present
 *  user scored against the caller's own bio_embedding + intent_tags. */
export type MatchCandidateT = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  headline: string | null;
  intent_tags: string[] | null;
  match_score: number;
  why_meet?: string;
};

export type NearbyPersonT = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  lat: number;
  lon: number;
};

export type ResearchT = {
  answer: string;
  sources: { title: string; url: string }[];
  provider: "linkup" | "offline";
};

/** One guest on a Slice A event brief (Luma-style list). */
export type ContactNoteT = {
  where_met: string;
  what_talked: string;
  why: string;
};

export type AttendeeT = {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  linkedin_url: string;
  x_url: string;
  website_url: string | null;
  why_meet: string;
  avatar_url: string | null;
  note: ContactNoteT;
};

export type EventBriefT = {
  id: string;
  title: string;
  datetime: string;
};
