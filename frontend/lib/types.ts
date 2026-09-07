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

/** One guest on a Slice A event brief (Luma-style list). */
export type ContactNoteT = {
  where_met: string;
  what_talked: string;
  why: string;
};

export type AttendeePriorityT = "needs_you" | "high" | "later";

export type EvidenceItemT = {
  source_id: string;
  quote: string;
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
  priority: AttendeePriorityT;
  linkedin_connected: boolean;
  x_interacted: boolean;
  note: ContactNoteT;
  note_payload: string;
  dm_payload: string;
  evidence: EvidenceItemT[];
};

export type EventBriefT = {
  id: string;
  title: string;
  datetime: string;
};
