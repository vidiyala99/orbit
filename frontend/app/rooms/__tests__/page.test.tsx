import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RoomsPage from "../page";
import { RoomT, UserT } from "@/lib/types";

const cookieValue = vi.fn<() => string | undefined>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "sc_token" ? { value: cookieValue() } : undefined),
  }),
}));

const fetchNearbyRooms = vi.fn();
vi.mock("@/lib/api", () => ({
  fetchNearbyRooms: (...args: unknown[]) => fetchNearbyRooms(...args),
  createRoom: vi.fn(),
}));

const requireOnboarded = vi.fn();
vi.mock("@/lib/requireOnboarded", () => ({ requireOnboarded: () => requireOnboarded() }));

const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
  usePathname: () => "/rooms",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/auth", () => ({ getClientToken: () => "tok", clearClientToken: vi.fn() }));

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
  fetchNearbyRooms.mockReset();
  requireOnboarded.mockReset();
  redirect.mockClear();
  fetchNearbyRooms.mockResolvedValue([]);
  requireOnboarded.mockResolvedValue(makeUser());
  cookieValue.mockReturnValue("tok");
});

async function renderPage() {
  render(await RoomsPage());
}

describe("RoomsPage access", () => {
  it("redirects anonymous visitors to sign in", async () => {
    cookieValue.mockReturnValue(undefined);
    await expect(RoomsPage()).rejects.toThrow("REDIRECT:/sign-in");
    expect(fetchNearbyRooms).not.toHaveBeenCalled();
  });
});

describe("RoomsPage data", () => {
  it("fetches rooms around the signed-in user's coordinates", async () => {
    await renderPage();
    expect(fetchNearbyRooms.mock.calls[0][0]).toBe(30.2672);
    expect(fetchNearbyRooms.mock.calls[0][1]).toBe(-97.7431);
    expect(fetchNearbyRooms.mock.calls[0][3]).toBe("tok");
  });

  it("falls back to Mountain View when the user has no coordinates", async () => {
    requireOnboarded.mockResolvedValue(makeUser({ lat: null, lon: null }));
    await renderPage();
    expect(fetchNearbyRooms.mock.calls[0][0]).toBe(37.3861);
    expect(fetchNearbyRooms.mock.calls[0][1]).toBe(-122.0839);
  });

  it("renders the fetched rooms", async () => {
    fetchNearbyRooms.mockResolvedValue([room]);
    await renderPage();
    expect(screen.getByText("Founders Cowork Wednesdays")).toBeInTheDocument();
  });
});

describe("RoomsPage chrome", () => {
  it("greets the user and names the city", async () => {
    await renderPage();
    expect(screen.getByText(/hey,\s*maya/i)).toBeInTheDocument();
    expect(screen.getByText(/austin, tx/i)).toBeInTheDocument();
  });

  it("renders both nav shells with Rooms current", async () => {
    await renderPage();
    for (const label of [/sections/i, /main/i]) {
      const nav = within(screen.getByRole("navigation", { name: label }));
      expect(nav.getByRole("link", { name: /rooms/i })).toHaveAttribute("aria-current", "page");
    }
  });
});
