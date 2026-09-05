import type { NearbyPersonT, PlanT, RoomT } from "./types";
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
