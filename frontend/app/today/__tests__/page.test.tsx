import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TodayPage from "../page";
import { PlanT, RoomT, UserT } from "@/lib/types";

const cookieValue = vi.fn<() => string | undefined>();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "sc_token" ? { value: cookieValue() } : undefined) }),
}));

const fetchNearbyPlans = vi.fn();
const fetchNearbyRooms = vi.fn();
vi.mock("@/lib/api", () => ({
  fetchNearbyPlans: (...args: unknown[]) => fetchNearbyPlans(...args),
  fetchNearbyRooms: (...args: unknown[]) => fetchNearbyRooms(...args),
  joinWaitlist: vi.fn(),
  fetchWaitlistCount: vi.fn(),
}));

const requireOnboarded = vi.fn();
vi.mock("@/lib/requireOnboarded", () => ({ requireOnboarded: () => requireOnboarded() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/today",
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
  text: "Coffee chat",
  lat: 30.26,
  lon: -97.74,
  starts_at: new Date(Date.now() - 60000).toISOString(),
  ends_at: new Date(Date.now() + 3600000).toISOString(),
};

function makeRoom(over: Partial<RoomT> = {}): RoomT {
  return {
    id: "r1",
    creator_id: "u2",
    name: "Austin Founders",
    purpose: "cowork",
    visibility: "public",
    lat: 30.26,
    lon: -97.74,
    created_at: "2026-08-01T00:00:00Z",
    member_count: 3,
    is_member: false,
    ...over,
  };
}

beforeEach(() => {
  cookieValue.mockReset();
  fetchNearbyPlans.mockReset();
  fetchNearbyRooms.mockReset();
  requireOnboarded.mockReset();
  fetchNearbyPlans.mockResolvedValue([]);
  fetchNearbyRooms.mockResolvedValue([]);
  requireOnboarded.mockResolvedValue(null);
});

async function renderPage() {
  render(await TodayPage());
}

describe("TodayPage navigation", () => {
  it("links to how it works and about whether signed in or not", async () => {
    cookieValue.mockReturnValue(undefined);
    await renderPage();
    expect(screen.getByRole("link", { name: /how it works/i })).toHaveAttribute("href", "/how-it-works");
    expect(screen.getByRole("link", { name: /about/i })).toHaveAttribute("href", "/about");
  });

  it("keeps the nav links when signed in", async () => {
    cookieValue.mockReturnValue("tok");
    requireOnboarded.mockResolvedValue(makeUser());
    await renderPage();
    expect(screen.getByRole("link", { name: /how it works/i })).toHaveAttribute("href", "/how-it-works");
    expect(screen.getByRole("link", { name: /about/i })).toHaveAttribute("href", "/about");
  });
});

describe("TodayPage section navs", () => {
  it("shows the four sections in both nav shells, with Wall current", async () => {
    cookieValue.mockReturnValue("tok");
    requireOnboarded.mockResolvedValue(makeUser());
    await renderPage();
    for (const label of [/sections/i, /main/i]) {
      const nav = within(screen.getByRole("navigation", { name: label }));
      expect(nav.getByRole("link", { name: /wall/i })).toHaveAttribute("aria-current", "page");
      expect(nav.getByRole("link", { name: /^map$/i })).toHaveAttribute("href", "/map");
      expect(nav.getByRole("link", { name: /^rooms$/i })).toHaveAttribute("href", "/rooms");
      expect(nav.getByRole("link", { name: /^chats$/i })).toHaveAttribute("href", "/chats");
    }
  });

  it("hides the tab bar from anonymous visitors", async () => {
    cookieValue.mockReturnValue(undefined);
    await renderPage();
    expect(screen.queryByRole("link", { name: /wall/i })).not.toBeInTheDocument();
  });
});

describe("TodayPage greeting", () => {
  it("greets a signed-in user by first name", async () => {
    cookieValue.mockReturnValue("tok");
    requireOnboarded.mockResolvedValue(makeUser());
    await renderPage();
    expect(screen.getByText(/hey,\s*maya/i)).toBeInTheDocument();
  });

  it("shows the generic subtitle for anonymous visitors", async () => {
    cookieValue.mockReturnValue(undefined);
    await renderPage();
    expect(screen.getByText(/networking runs on luck/i)).toBeInTheDocument();
    expect(screen.queryByText(/^hey /i)).not.toBeInTheDocument();
  });

  it("falls back to the generic subtitle when first_name is missing", async () => {
    cookieValue.mockReturnValue("tok");
    requireOnboarded.mockResolvedValue(makeUser({ first_name: null }));
    await renderPage();
    expect(screen.getByText(/networking runs on luck/i)).toBeInTheDocument();
  });
});

describe("TodayPage discovery location", () => {
  it("uses the signed-in user's coordinates", async () => {
    cookieValue.mockReturnValue("tok");
    requireOnboarded.mockResolvedValue(makeUser());
    await renderPage();
    expect(fetchNearbyPlans.mock.calls[0][0]).toBe(30.2672);
    expect(fetchNearbyPlans.mock.calls[0][1]).toBe(-97.7431);
  });

  it("falls back to Mountain View when the user has no coordinates", async () => {
    cookieValue.mockReturnValue("tok");
    requireOnboarded.mockResolvedValue(makeUser({ lat: null, lon: null }));
    await renderPage();
    expect(fetchNearbyPlans.mock.calls[0][0]).toBe(37.3861);
    expect(fetchNearbyPlans.mock.calls[0][1]).toBe(-122.0839);
  });

  it("falls back to Mountain View for anonymous visitors", async () => {
    cookieValue.mockReturnValue(undefined);
    await renderPage();
    expect(fetchNearbyPlans.mock.calls[0][0]).toBe(37.3861);
    expect(fetchNearbyPlans.mock.calls[0][1]).toBe(-122.0839);
  });
});

describe("TodayPage calendar banner", () => {
  it("shows the connect ribbon to a signed-in user without calendar access", async () => {
    cookieValue.mockReturnValue("tok");
    requireOnboarded.mockResolvedValue(makeUser());
    await renderPage();
    expect(screen.getByText(/connect google calendar/i)).toBeInTheDocument();
  });

  it("does not mount the banner for anonymous visitors", async () => {
    cookieValue.mockReturnValue(undefined);
    await renderPage();
    expect(screen.queryByText(/connect google calendar/i)).not.toBeInTheDocument();
  });
});

describe("TodayPage desktop layout", () => {
  it("widens past the mobile column and splits into main + rail when signed in", async () => {
    cookieValue.mockReturnValue("tok");
    requireOnboarded.mockResolvedValue(makeUser());
    await renderPage();
    expect(screen.getByRole("main").className).toMatch(/md:max-w-6xl/);
    expect(screen.getByTestId("today-split").className).toMatch(
      /md:grid-cols-\[minmax\(0,1fr\)_300px\]/,
    );
  });

  it("widens without a rail when signed out", async () => {
    cookieValue.mockReturnValue(undefined);
    await renderPage();
    expect(screen.getByRole("main").className).toMatch(/md:max-w-2xl/);
    expect(screen.queryByRole("complementary", { name: /rooms near you/i })).not.toBeInTheDocument();
  });
});

describe("TodayPage rooms rail", () => {
  it("lists nearby rooms with member counts and a link to browse", async () => {
    cookieValue.mockReturnValue("tok");
    requireOnboarded.mockResolvedValue(makeUser());
    fetchNearbyRooms.mockResolvedValue([makeRoom(), makeRoom({ id: "r2", name: "Study Hall", member_count: 1 })]);
    await renderPage();
    const rail = within(screen.getByRole("complementary", { name: /rooms near you/i }));
    expect(rail.getByRole("link", { name: /austin founders/i })).toHaveAttribute("href", "/rooms/r1");
    expect(rail.getByText(/3 members/i)).toBeInTheDocument();
    expect(rail.getByText(/1 member$/i)).toBeInTheDocument();
    expect(rail.getByRole("link", { name: /browse rooms/i })).toHaveAttribute("href", "/rooms");
  });

  it("shows an empty rail card when there are no rooms nearby", async () => {
    cookieValue.mockReturnValue("tok");
    requireOnboarded.mockResolvedValue(makeUser());
    await renderPage();
    const rail = within(screen.getByRole("complementary", { name: /rooms near you/i }));
    expect(rail.getByText(/no rooms near you yet/i)).toBeInTheDocument();
  });

  it("still renders the wall when the rooms lookup fails", async () => {
    cookieValue.mockReturnValue("tok");
    requireOnboarded.mockResolvedValue(makeUser());
    fetchNearbyRooms.mockRejectedValue(new Error("boom"));
    fetchNearbyPlans.mockResolvedValue([plan]);
    await renderPage();
    expect(screen.getByText("Coffee chat")).toBeInTheDocument();
  });

  it("does not look up rooms for anonymous visitors", async () => {
    cookieValue.mockReturnValue(undefined);
    await renderPage();
    expect(fetchNearbyRooms).not.toHaveBeenCalled();
  });
});

describe("TodayPage empty state", () => {
  it("prompts a signed-in user to post the first plan", async () => {
    cookieValue.mockReturnValue("tok");
    requireOnboarded.mockResolvedValue(makeUser());
    await renderPage();
    expect(screen.getAllByRole("link", { name: /post a plan/i })[0]).toHaveAttribute("href", "/post");
    expect(screen.getByText(/first one in a city is always the quietest/i)).toBeInTheDocument();
  });

  it("does not show a post prompt when signed out", async () => {
    cookieValue.mockReturnValue(undefined);
    await renderPage();
    expect(screen.queryByRole("link", { name: /post a plan/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/first one in a city is always the quietest/i)).not.toBeInTheDocument();
    expect(screen.getByText(/no plans pinned near you yet/i)).toBeInTheDocument();
  });

  it("shows the post-a-plan link and no empty state when plans exist", async () => {
    cookieValue.mockReturnValue("tok");
    requireOnboarded.mockResolvedValue(makeUser());
    fetchNearbyPlans.mockResolvedValue([plan]);
    await renderPage();
    expect(screen.getByText("Coffee chat")).toBeInTheDocument();
    expect(screen.queryByText(/first one in a city is always the quietest/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /post a plan/i })[0]).toHaveAttribute("href", "/post");
  });
});
