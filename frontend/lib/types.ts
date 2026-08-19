export type UserT = {
  id: string;
  clerk_id: string;
  name: string;
  headline: string | null;
  linkedin_url: string | null;
  avatar_url: string | null;
};

export type PlanT = {
  id: string;
  user_id: string;
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
