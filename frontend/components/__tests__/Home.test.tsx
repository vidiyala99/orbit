import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Home from "../Home";
import type { HomeDataT } from "@/lib/events";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

const patchPersonMock = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, patchPerson: (...args: unknown[]) => patchPersonMock(...args) };
});
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getClientToken: () => "test-token" };
});

const EMPTY: HomeDataT = {
  upcoming: [],
  past: [],
  needsFollowUp: [],
  lastSyncedAt: null,
  featuredEvent: null,
  topShortlist: [],
  shortlistTotal: 0,
  jobTarget: { targetRole: null, targetIndustries: null },
  lumaConnected: false,
};

const DATA: HomeDataT = {
  ...EMPTY,
  upcoming: [{
    id: "evt-1", title: "Blinkko Launch Party", source_url: null,
    location: "221 11th St, San Francisco", starts_at: new Date(Date.now() + 86400000).toISOString(),
    ends_at: null, guest_count: 157, synced_at: "2026-09-08T00:00:00Z", shortlist_count: 6,
  }],
  needsFollowUp: [
    {
      id: "p-1", first_name: "Alex", last_name: "Rivera", role: "Partner, Westbound Ventures",
      priority: "needs_you", event_title: "Founders Cowork Wednesdays", event_ended_days_ago: 4,
      why: "Backs early infra bets", note_payload: null, dm_payload: null,
    },
    {
      id: "p-9", first_name: "Priya", last_name: "Nair", role: "Founder, Loomwork",
      priority: "high", event_title: "Demo Night", event_ended_days_ago: 2,
      why: "Building in your target space", note_payload: null, dm_payload: null,
    },
  ],
  featuredEvent: { id: "evt-1", title: "Blinkko Launch Party" },
  topShortlist: [
    {
      id: "p-2", first_name: "Shuo", last_name: "Chen", role: "General Partner, IOVC",
      score: 94, why: "Actively funding B2B infra", avatar_url: null, intent: "Investing",
    },
    { id: "p-3", first_name: "Mara", last_name: "Osei", role: "Principal, Fieldstone", score: 88, why: "", avatar_url: null, intent: "Investing" },
    { id: "p-4", first_name: "Jon", last_name: "Petrov", role: "Founder, Dryline", score: 81, why: "", avatar_url: null, intent: "Hiring" },
    { id: "p-5", first_name: "Ines", last_name: "Alvarez", role: "GP, Northmark", score: 77, why: "", avatar_url: null, intent: null },
    { id: "p-6", first_name: "Theo", last_name: "Bright", role: "Partner, Corestack", score: 70, why: "", avatar_url: null, intent: "Investing" },
    { id: "p-7", first_name: "Wren", last_name: "Kato", role: "Founder, Alkali", score: 65, why: "", avatar_url: null, intent: null },
    { id: "p-8", first_name: "Dax", last_name: "Feldman", role: "VP, Slate Capital", score: 58, why: "", avatar_url: null, intent: "Hiring", boostReason: "hiring" },
  ],
  shortlistTotal: 7,
  jobTarget: { targetRole: "Product Manager", targetIndustries: ["fintech"] },
};

describe("Home", () => {
  it("renders the shortlist section with a ranked person", () => {
    render(<Home data={DATA} />);
    expect(screen.getByText(/^Shortlist — /i)).toBeInTheDocument();
    expect(screen.getByText(/Shuo Chen/)).toBeInTheDocument();
    expect(screen.getByText("94")).toBeInTheDocument();
  });

  it("shows the follow-up focus card for the most urgent follow-up", () => {
    render(<Home data={DATA} />);
    expect(screen.getByRole("heading", { name: /^follow up$/i })).toBeInTheDocument();
    expect(screen.getByText(/alex rivera/i)).toBeInTheDocument();
    expect(screen.getByText(/1 of 2 to follow up/i)).toBeInTheDocument();
  });

  it("shows the focus card's caught-up end state and the past-events empty state when both are empty", () => {
    render(<Home data={EMPTY} />);
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    expect(screen.getByText(/no past events yet/i)).toBeInTheDocument();
  });

  it("shows the follow-up focus card regardless of whether a shortlist exists", () => {
    const data: HomeDataT = {
      ...EMPTY,
      needsFollowUp: [{
        id: "p-9", first_name: "Priya", last_name: "Nair", role: "Founder, Loomwork",
        priority: "needs_you", event_title: "Demo Night", event_ended_days_ago: 2,
        why: "Building in your target space", note_payload: null, dm_payload: null,
      }],
    };
    render(<Home data={data} />);
    expect(screen.getAllByText(/priya nair/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/no upcoming event yet/i)).toBeInTheDocument();
  });

  it("renders a Sync now button with a last-synced timestamp", () => {
    render(<Home data={DATA} />);
    expect(screen.getByRole("button", { name: /sync now/i })).toBeInTheDocument();
  });

  it("renders the at-a-glance stats", () => {
    render(<Home data={DATA} />);
    expect(screen.getByText(/At a glance/i)).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("keeps shortlist rows collapsed by default and expands 'why' via the chevron without navigating", () => {
    render(<Home data={DATA} />);

    const row = screen.getByText("Shuo Chen").closest("div")!;
    const rowContainer = row.parentElement!.parentElement!;
    const link = within(rowContainer).getByRole("link", { name: /shuo chen/i });
    expect(link).toHaveAttribute("href", "/attendees/p-2");
    expect(link).not.toHaveAttribute("title");

    const whyText = screen.getByText(/actively funding b2b infra/i);
    const track = whyText.parentElement!.parentElement!;
    expect(track).toHaveStyle({ gridTemplateRows: "0fr" });

    const chevron = within(rowContainer).getByRole("button", { name: /show why shuo chen/i });
    fireEvent.click(chevron);

    expect(track).toHaveStyle({ gridTemplateRows: "1fr" });
    expect(within(rowContainer).getByRole("button", { name: /hide why shuo chen/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    expect(link).toHaveAttribute("href", "/attendees/p-2");
  });

  it("skips the chevron entirely when a shortlist person has no why", () => {
    render(<Home data={DATA} />);
    const row = screen.getByText("Mara Osei").closest("div")!;
    const rowContainer = row.parentElement!.parentElement!;
    expect(within(rowContainer).queryByRole("button")).not.toBeInTheDocument();
  });

  it("advances the follow-up card via the next-person arrow, without calling PATCH", () => {
    render(<Home data={DATA} />);
    expect(screen.getByText(/alex rivera/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /next person/i }));

    expect(screen.getByText(/priya nair/i)).toBeInTheDocument();
    expect(patchPersonMock).not.toHaveBeenCalled();
  });
});
