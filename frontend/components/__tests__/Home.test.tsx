import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Home from "../Home";
import type { HomeDataT } from "@/lib/events";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

const triagePersonMock = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, triagePerson: (...args: unknown[]) => triagePersonMock(...args) };
});
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getClientToken: () => "test-token" };
});

const realMatchMedia = window.matchMedia;

function mockPhoneLayout() {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("max-width: 767"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

const EMPTY: HomeDataT = {
  upcoming: [],
  past: [],
  events: [],
  reviewQueue: [],
  catchUp: [],
  inboxCount: 0,
  lastSyncedAt: null,
  featuredEvent: null,
  jobTarget: { targetRole: null, targetIndustries: null },
  focus: { role: null, struggle: null },
  lumaConnected: false,
};

const DATA: HomeDataT = {
  ...EMPTY,
  upcoming: [{
    id: "evt-1", title: "Blinkko Launch Party", source_url: null,
    location: "221 11th St, San Francisco", starts_at: new Date(Date.now() + 86400000).toISOString(),
    ends_at: null, guest_count: 157, synced_at: "2026-09-08T00:00:00Z", shortlist_count: 6,
  }],
  events: [{
    id: "evt-1", title: "Blinkko Launch Party", source_url: null,
    location: "221 11th St, San Francisco", starts_at: new Date(Date.now() + 86400000).toISOString(),
    ends_at: null, guest_count: 157, synced_at: "2026-09-08T00:00:00Z", shortlist_count: 6,
  }],
  featuredEvent: { id: "evt-1", title: "Blinkko Launch Party", location: "221 11th St, San Francisco" },
  reviewQueue: [
    {
      id: "p-2", first_name: "Shuo", last_name: "Chen", role: "General Partner, IOVC",
      priority: "needs_you", event_title: "Blinkko Launch Party", event_ended_days_ago: 0,
      event_upcoming: true, why: "Actively funding B2B infra", note_payload: null, dm_payload: null,
    },
    {
      id: "p-3", first_name: "Mara", last_name: "Osei", role: "Principal, Fieldstone",
      priority: "high", event_title: "Blinkko Launch Party", event_ended_days_ago: 0,
      event_upcoming: true, why: "Building in your space", note_payload: null, dm_payload: null,
    },
  ],
  inboxCount: 2,
};

describe("Home", () => {
  beforeEach(() => {
    mockPhoneLayout();
  });

  afterEach(() => {
    window.matchMedia = realMatchMedia;
  });

  it("leads with the Focus card for the ranked review queue", async () => {
    render(<Home data={DATA} />);
    expect(screen.getByRole("heading", { name: /blinkko launch party/i })).toBeInTheDocument();
    expect(screen.getByText(/product launch/i)).toBeInTheDocument();
    expect(screen.getByText(/san francisco/i)).toBeInTheDocument();
    expect(await screen.findByText(/shuo chen/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^keep$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^skip$/i })).toBeInTheDocument();
    expect(screen.queryByText(/1\s*\/\s*2/)).not.toBeInTheDocument();
  });

  it("does not show a dead Follow up section", () => {
    render(<Home data={DATA} />);
    expect(screen.queryByRole("heading", { name: /^follow up$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/all caught up/i)).not.toBeInTheDocument();
  });

  it("shows room-reviewed empty state when the queue is empty but an event exists", async () => {
    render(<Home data={{ ...DATA, reviewQueue: [] }} />);
    expect(await screen.findByText(/room reviewed/i)).toBeInTheDocument();
  });

  it("prompts when there is no featured event", () => {
    render(<Home data={EMPTY} />);
    expect(screen.getByText(/no event ready yet/i)).toBeInTheDocument();
  });

  it("shows events and catch-up when there is no Focus room but data exists", () => {
    render(
      <Home
        data={{
          ...EMPTY,
          events: [
            {
              id: "evt-9",
              title: "Past Mixer",
              source_url: null,
              location: "SF",
              starts_at: new Date(Date.now() - 86400000).toISOString(),
              ends_at: null,
              guest_count: 40,
              synced_at: "2026-09-08T00:00:00Z",
              shortlist_count: 0,
            },
          ],
          catchUp: [
            {
              id: "kept-1",
              first_name: "Ada",
              last_name: "Lovelace",
              role: "Founder",
              why: "",
              avatar_url: null,
              event_title: "Past Mixer",
              triaged_at: "2026-09-08T00:00:00Z",
              email: "ada@example.com",
              email_body: "hi",
              dm_body: "hi",
            },
          ],
        }}
      />,
    );
    expect(screen.getByRole("heading", { name: /where to next/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^events$/i })).toBeInTheDocument();
    expect(screen.getByText(/past mixer/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /catch up/i })).toBeInTheDocument();
    expect(screen.getByText(/ada lovelace/i)).toBeInTheDocument();
    expect(screen.queryByText(/no upcoming event yet/i)).not.toBeInTheDocument();
  });

  it("renders review and inbox counts without Connect/Sync chrome", () => {
    render(<Home data={DATA} />);
    expect(screen.queryByRole("button", { name: /sync now/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /connect luma/i })).not.toBeInTheDocument();
    expect(screen.getByText(/left/i)).toBeInTheDocument();
    expect(screen.getByText(/inbox/i)).toBeInTheDocument();
  });

  it("Keep calls triage and advances", async () => {
    triagePersonMock.mockResolvedValue({});
    render(<Home data={DATA} />);
    fireEvent.click(await screen.findByRole("button", { name: /^keep$/i }));
    await waitFor(() =>
      expect(triagePersonMock).toHaveBeenCalledWith("p-2", "kept", "test-token"),
    );
  });
});
