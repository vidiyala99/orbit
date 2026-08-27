import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MapPage from "../page";
import { PlanT, RoomT, UserT } from "@/lib/types";

const cookieValue = vi.fn<() => string | undefined>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "sc_token" ? { value: cookieValue() } : undefined),
  }),
}));

const fetchNearbyPlans = vi.fn();
const fetchNearbyRooms = vi.fn();
vi.mock("@/lib/api", () => ({
  fetchNearbyPlans: (...args: unknown[]) => fetchNearbyPlans(...args),
  fetchNearbyRooms: (...args: unknown[]) => fetchNearbyRooms(...args),
}));

const requireOnboarded = vi.fn();
vi.mock("@/lib/requireOnboarded", () => ({ requireOnboarded: () => requireOnboarded() }));

const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
  usePathname: () => "/map",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function makeUser(over: Partial<UserT> = {}): UserT {
  return {
    id: "u1",
    email: "a@b.com",
    email_verified_at: null,
    headline: null,
    linkedin_url: null,
    avatar_url: null,
    first_name: "Maya",
    last_name: "Rao",
    city: "Austin, TX",
    lat: 30.2672,
    lon: -97.7431,
    pain_points: null,
    pain_point_other: null,
    onboarded_at: "2026-08-01T00:00:00Z",
    google_calendar_connected: false,
    ...over,
  };
}

const plan: PlanT = {
  id: "p1",
  user_id: "u2",
  activity: "coffee",
  openness: "open_to_chat",
  detail: null,
  text: "Grabbing coffee, open to chat",
  lat: 30.27,
  lon: -97.74,
  starts_at: new Date(Date.now() - 60000).toISOString(),
  ends_at: new Date(Date.now() + 45 * 60000).toISOString(),
};

const room: RoomT = {
  id: "r1",
  creator_id: "u9",
  name: "Founders Cowork Wednesdays",
  purpose: "cowork",
  visibility: "public",
  lat: 30.26,
  lon: -97.74,
  created_at: "2026-08-20T10:00:00Z",
  member_count: 7,
  is_member: false,
};

beforeEach(() => {
  cookieValue.mockReset();
  fetchNearbyPlans.mockReset();
  fetchNearbyRooms.mockReset();
  requireOnboarded.mockReset();
  redirect.mockClear();
  Element.prototype.scrollIntoView = vi.fn();
  fetchNearbyPlans.mockResolvedValue([]);
  fetchNearbyRooms.mockResolvedValue([]);
  requireOnboarded.mockResolvedValue(makeUser());
  cookieValue.mockReturnValue("tok");
});

async function renderPage() {
  render(await MapPage());
}

describe("MapPage access", () => {
  it("redirects anonymous visitors to sign in", async () => {
    cookieValue.mockReturnValue(undefined);
    await expect(MapPage()).rejects.toThrow("REDIRECT:/sign-in");
  });
});

describe("MapPage data", () => {
  it("fetches plans and rooms around the same coordinates", async () => {
    await renderPage();
    expect(fetchNearbyPlans.mock.calls[0][0]).toBe(30.2672);
    expect(fetchNearbyRooms.mock.calls[0][0]).toBe(30.2672);
    expect(fetchNearbyPlans.mock.calls[0][1]).toBe(-97.7431);
    expect(fetchNearbyRooms.mock.calls[0][1]).toBe(-97.7431);
  });

  it("renders both plan and room pins and list rows", async () => {
    fetchNearbyPlans.mockResolvedValue([plan]);
    fetchNearbyRooms.mockResolvedValue([room]);
    await renderPage();
    expect(screen.getByTestId("pin-plan-p1")).toBeInTheDocument();
    expect(screen.getByTestId("pin-room-r1")).toBeInTheDocument();
    expect(screen.getByTestId("item-plan-p1")).toBeInTheDocument();
    expect(screen.getByTestId("item-room-r1")).toBeInTheDocument();
  });

  it("counts everything nearby in the subline", async () => {
    fetchNearbyPlans.mockResolvedValue([plan]);
    fetchNearbyRooms.mockResolvedValue([room]);
    await renderPage();
    expect(screen.getByText(/2 things nearby in austin, tx/i)).toBeInTheDocument();
  });

  it("renders both nav shells with Map current", async () => {
    await renderPage();
    for (const label of [/sections/i, /main/i]) {
      const nav = within(screen.getByRole("navigation", { name: label }));
      expect(nav.getByRole("link", { name: /map/i })).toHaveAttribute("aria-current", "page");
    }
  });
});
