import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TodayPage from "../page";
import { PlanT, UserT } from "@/lib/types";

const cookieValue = vi.fn<() => string | undefined>();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "sc_token" ? { value: cookieValue() } : undefined) }),
}));

const fetchNearbyPlans = vi.fn();
vi.mock("@/lib/api", () => ({
  fetchNearbyPlans: (...args: unknown[]) => fetchNearbyPlans(...args),
  joinWaitlist: vi.fn(),
  fetchWaitlistCount: vi.fn(),
}));

const requireOnboarded = vi.fn();
vi.mock("@/lib/requireOnboarded", () => ({ requireOnboarded: () => requireOnboarded() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

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

beforeEach(() => {
  cookieValue.mockReset();
  fetchNearbyPlans.mockReset();
  requireOnboarded.mockReset();
  fetchNearbyPlans.mockResolvedValue([]);
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

describe("TodayPage greeting", () => {
  it("greets a signed-in user by first name", async () => {
    cookieValue.mockReturnValue("tok");
    requireOnboarded.mockResolvedValue(makeUser());
    await renderPage();
    expect(screen.getByText(/hey maya/i)).toBeInTheDocument();
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
