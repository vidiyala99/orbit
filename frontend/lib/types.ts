export type UserT = {
  id: string;
  email: string;
  email_verified_at: string | null;
  headline: string | null;
  linkedin_url: string | null;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
  target_role?: string | null;
  target_industries?: string[] | null;
  onboarded_at: string | null;
  luma_connected: boolean;
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
  /** Role-aware pre-event prep questions. Null until researched — render
   *  the section as absent, not an empty state. */
  talking_points: string[] | null;
};

export type EventBriefT = {
  id: string;
  title: string;
  datetime: string;
  /** ISO string. Null for the offline fixture event, which has no real date. */
  starts_at: string | null;
};
