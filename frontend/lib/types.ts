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

export type ThreadT = { id: string; user_a_id: string; user_b_id: string };

export type MessageT = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type StampT = { confirmed: boolean; confirmed_at: string | null };
