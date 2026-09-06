import type { AttendeeT, EventBriefT, NearbyPersonT, PlanT, RoomT } from "./types";
import type { OrbitLocation, ThemeKey } from "./orbit";

export const DEMO_OFFLINE_TOKEN = "orbit-demo-offline";

const now = () => Date.now();

function plan(
  id: string,
  userId: string,
  activity: string,
  detail: string,
  origin: OrbitLocation,
  latOff: number,
  lonOff: number,
  startsInMin: number,
  minutes: number,
): PlanT {
  const starts = new Date(now() + startsInMin * 60_000);
  const ends = new Date(starts.getTime() + minutes * 60_000);
  return {
    id,
    user_id: userId,
    activity,
    openness: "open_to_chat",
    detail,
    text: detail,
    lat: origin.lat + latOff,
    lon: origin.lon + lonOff,
    starts_at: starts.toISOString(),
    ends_at: ends.toISOString(),
  };
}

const THEME_EVENTS: Record<ThemeKey, { detail: string; activity: string; latOff: number; lonOff: number }[]> = {
  tech: [
    { detail: "AI / startup hack table — looking for a technical co-founder.", activity: "event", latOff: 0.003, lonOff: 0.001 },
    { detail: "Red Rock Coffee, upstairs by the window.", activity: "cowork", latOff: 0, lonOff: 0 },
  ],
  design: [
    { detail: "Figma design critique at the cowork loft.", activity: "event", latOff: 0.005, lonOff: -0.002 },
    { detail: "Sketch-and-walk meetup at the plaza.", activity: "event", latOff: 0.002, lonOff: 0.003 },
  ],
  food: [
    { detail: "Philz on Castro — happy to talk job hunt.", activity: "coffee", latOff: 0.004, lonOff: -0.005 },
    { detail: "Lunch at the plaza, laptop open.", activity: "meal", latOff: -0.006, lonOff: 0.003 },
  ],
  music: [
    { detail: "Vinyl listening hour — bring one record.", activity: "event", latOff: -0.003, lonOff: -0.004 },
    { detail: "Open-mic after the show.", activity: "event", latOff: 0.002, lonOff: 0.002 },
  ],
  sports: [
    { detail: "Lunch run from Castro, easy 5k.", activity: "event", latOff: 0.001, lonOff: 0.004 },
    { detail: "Pickup soccer + music after.", activity: "event", latOff: -0.002, lonOff: 0.003 },
  ],
  outdoors: [
    { detail: "Walk the bay trail after work.", activity: "event", latOff: -0.004, lonOff: 0.005 },
    { detail: "Sunset sit at the park lawn.", activity: "event", latOff: 0.003, lonOff: -0.003 },
  ],
};

export function fixturePeople(origin: OrbitLocation): NearbyPersonT[] {
  return [
    {
      user_id: "demo-priya",
      first_name: "Priya",
      last_name: "Raman",
      status: "Working in a café",
      lat: origin.lat,
      lon: origin.lon,
    },
    {
      user_id: "demo-marcus",
      first_name: "Marcus",
      last_name: "Ellis",
      status: "At a hackathon",
      lat: origin.lat + 0.003,
      lon: origin.lon + 0.002,
    },
    {
      user_id: "demo-jules",
      first_name: "Jules",
      last_name: "Okada",
      status: "Just exploring",
      lat: origin.lat - 0.002,
      lon: origin.lon + 0.004,
    },
  ];
}

export function fixturePlans(origin: OrbitLocation, theme: ThemeKey): PlanT[] {
  return THEME_EVENTS[theme].map((row, i) =>
    plan(`fixture-plan-${theme}-${i}`, "demo-companion", row.activity, row.detail, origin, row.latOff, row.lonOff, -10 + i * 15, 90),
  );
}

export function fixtureRooms(origin: OrbitLocation): RoomT[] {
  return [
    {
      id: "fixture-room-founders",
      creator_id: "demo-guest",
      name: "Founders Cowork Wednesdays",
      purpose: "cowork",
      visibility: "public",
      lat: origin.lat + 0.002,
      lon: origin.lon + 0.002,
      created_at: new Date(now() - 3600_000).toISOString(),
      member_count: 3,
      is_member: true,
    },
    {
      id: "fixture-room-regulars",
      creator_id: "demo-guest",
      name: "Peninsula Regulars",
      purpose: "cowork",
      visibility: "public",
      lat: origin.lat,
      lon: origin.lon,
      created_at: new Date(now() - 7200_000).toISOString(),
      member_count: 2,
      is_member: true,
    },
  ];
}

export function orFixtures<T>(rows: T[] | undefined, fallback: T[]): T[] {
  return rows && rows.length > 0 ? rows : fallback;
}

/** Slice A demo event — matches the approved attendee-brief comp. */
export const FIXTURE_EVENT: EventBriefT = {
  id: "nerdconf-sf",
  title: "NERDCONF SF — Sat",
  datetime: "Saturday, June 7, 2025 • 10:00 AM – 4:00 PM PDT",
};

function attendee(
  id: string,
  first: string,
  last: string,
  role: string,
  why: string,
  note: AttendeeT["note"],
  extra: Partial<Pick<AttendeeT, "website_url" | "avatar_url">> = {},
): AttendeeT {
  const handle = `${first}-${last}`.toLowerCase().replace(/[^a-z-]/g, "");
  return {
    id,
    first_name: first,
    last_name: last,
    role,
    linkedin_url: `https://www.linkedin.com/in/${handle}`,
    x_url: `https://x.com/${handle.replace("-", "")}`,
    website_url: extra.website_url ?? null,
    why_meet: why,
    avatar_url: extra.avatar_url ?? null,
    note,
  };
}

export const FIXTURE_ATTENDEES: AttendeeT[] = [
  attendee(
    "alex-chen",
    "Alex",
    "Chen",
    "Founder, Render",
    "Building agent infra — overlap with your Render work",
    {
      where_met: "NERDCONF SF · hallway track",
      what_talked: "Agent infra and how teams ship evals without a second platform.",
      why: "Building the layer your last two projects already assume exists.",
    },
    { website_url: "https://render.com" },
  ),
  attendee(
    "marcus-ellis",
    "Marcus",
    "Ellis",
    "Founding Engineer at Render",
    "Shipping the runtime your agent stack would sit on",
    {
      where_met: "Burning Token hackathon · Austin",
      what_talked: "The future of agentic tools and how Render is thinking about infra for them.",
      why: "He's building in the same problem space and could be a great collaborator or advisor.",
    },
  ),
  attendee(
    "priya-raman",
    "Priya",
    "Raman",
    "ML Engineer, Lattice",
    "Hiring an ML engineer; you just shipped a ranking stack",
    {
      where_met: "Founders Cowork Wednesdays · Red Rock Coffee",
      what_talked: "Eval harnesses for search ranking and who to hire first.",
      why: "Same hiring problem, complementary stack.",
    },
  ),
  attendee(
    "jules-okada",
    "Jules",
    "Okada",
    "Independent designer",
    "Just shipped a spatial OS — wants a technical pair",
    {
      where_met: "NERDCONF SF · design lounge",
      what_talked: "How spatial UIs survive a 200-person room.",
      why: "Needs an engineer who has shipped event-scale surfaces.",
    },
    { website_url: "https://okada.work" },
  ),
  attendee(
    "dev-kim",
    "Dev",
    "Kim",
    "Seed investor",
    "Writing checks for event-infra this quarter",
    {
      where_met: "NERDCONF SF · investor office hours",
      what_talked: "Follow-up after the room dies — the actual retention hole.",
      why: "Looking at the category you're building in.",
    },
  ),
  attendee(
    "sam-ortiz",
    "Sam",
    "Ortiz",
    "Founder, Relays",
    "Same pain: follow-up after the room dies",
    {
      where_met: "Burning Token hackathon · Austin",
      what_talked: "What people actually copy-paste the next morning.",
      why: "Building the adjacent product; worth a weekly sync.",
    },
  ),
  attendee(
    "amina-shah",
    "Amina",
    "Shah",
    "Recruiter, Anthropic",
    "Placing applied-research ICs this month",
    {
      where_met: "NERDCONF SF · talent table",
      what_talked: "Who in the room is actually shipping vs. pitching.",
      why: "Can intro the applied-research ICs you asked about.",
    },
  ),
  attendee(
    "sophie-carter",
    "Sophie",
    "Carter",
    "Senior Brand Strategist at Horizon Creative",
    "Rewriting how event brands stay after the weekend",
    {
      where_met: "NERDCONF SF · brand workshop",
      what_talked: "Why most event follow-up reads like a newsletter.",
      why: "Can tighten the note you send the next morning.",
    },
  ),
  attendee(
    "maya-rao",
    "Maya",
    "Rao",
    "PM, Notion",
    "Owning the post-event workspace nobody opens",
    {
      where_met: "Peninsula Regulars · Castro",
      what_talked: "Turning a guest list into a living notes doc.",
      why: "Has the distribution; you have the contact note.",
    },
  ),
  attendee(
    "kenji-watanabe",
    "Kenji",
    "Watanabe",
    "Infra, Cloudflare",
    "Edge runtime for live attendee graphs",
    {
      where_met: "NERDCONF SF · infra birds of a feather",
      what_talked: "Keeping a 2k-person list snappy on a bad venue network.",
      why: "Would review the list path you're about to ship.",
    },
  ),
  attendee(
    "lina-park",
    "Lina",
    "Park",
    "Founder, Cork",
    "Same cork/cream brief — already in five cities",
    {
      where_met: "Founders Cowork Wednesdays · Red Rock Coffee",
      what_talked: "Warm paper UI that still reads as a product, not a mood board.",
      why: "Has operators in rooms you want next.",
    },
    { website_url: "https://cork.events" },
  ),
  attendee(
    "theo-brooks",
    "Theo",
    "Brooks",
    "Engineer, Vercel",
    "Shipped the last three conference companion apps",
    {
      where_met: "NERDCONF SF · hallway track",
      what_talked: "What actually gets opened the morning after.",
      why: "Knows the failure modes of guest-list products.",
    },
  ),
];

export function fixtureAttendee(id: string): AttendeeT | undefined {
  return FIXTURE_ATTENDEES.find((row) => row.id === id);
}

export function attendeeName(row: Pick<AttendeeT, "first_name" | "last_name">): string {
  return `${row.first_name} ${row.last_name}`;
}
