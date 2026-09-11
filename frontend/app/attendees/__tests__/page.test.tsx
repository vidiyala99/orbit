import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AttendeesPage from "../page";
import ContactNotePage from "../[id]/page";
import { FIXTURE_ATTENDEES, FIXTURE_EVENT } from "@/lib/demoFixtures";
import type { DeskGuests } from "@/lib/guests";

const notFound = vi.fn(() => {
  throw new Error("NOT_FOUND");
});
vi.mock("next/navigation", () => ({
  notFound: () => notFound(),
}));

const loadDeskGuests = vi.fn();
vi.mock("@/lib/guests", async () => {
  const actual = await vi.importActual<typeof import("@/lib/guests")>("@/lib/guests");
  return {
    ...actual,
    loadDeskGuests: (...args: unknown[]) => loadDeskGuests(...args),
  };
});

const fixtureDesk: DeskGuests = {
  event: FIXTURE_EVENT,
  attendees: FIXTURE_ATTENDEES,
  source: "fallback",
};

const liveDesk: DeskGuests = {
  event: { id: "blinkko-launch-party", title: "Blinkko Launch Party", datetime: "Tue, Sep 8", starts_at: "2020-01-01T00:00:00Z" },
  attendees: [
    {
      ...FIXTURE_ATTENDEES[0],
      id: "68d0e97d-4bfe-4142-996d-7ea1db58ed08",
      first_name: "Alex",
      last_name: "Rivera",
      role: "Partner, Westbound Ventures",
      why_meet: "Writing seed checks for clipboard-first personal CRM",
      priority: "needs_you",
      linkedin_connected: true,
      x_interacted: true,
      note_payload: "Met Alex Rivera in the coat-check line.",
      dm_payload: "Alex - great running into you at the mixer.",
    },
  ],
  source: "live",
};

beforeEach(() => {
  notFound.mockClear();
  loadDeskGuests.mockReset();
  loadDeskGuests.mockResolvedValue(fixtureDesk);
});

describe("AttendeesPage", () => {
  it("renders the desk with no session and no sign-in redirect", async () => {
    render(await AttendeesPage());
    expect(screen.getByRole("heading", { name: /nerdconf sf/i })).toBeInTheDocument();
    expect(screen.getByText("Alex Chen")).toBeInTheDocument();
    expect(screen.getByText("Marcus Ellis")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /today|capture|outreach/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/invitations/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
  });

  it("renders live guests when the loader returns Engine people", async () => {
    loadDeskGuests.mockResolvedValue(liveDesk);
    render(await AttendeesPage());
    expect(screen.getByRole("heading", { name: /blinkko launch party/i })).toBeInTheDocument();
    expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
    expect(screen.queryByText("Alex Chen")).not.toBeInTheDocument();
    expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^copy note$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^copy dm$/i })).toBeInTheDocument();
  });

  it("filters by search text pre-event", async () => {
    loadDeskGuests.mockResolvedValue({
      ...liveDesk,
      event: { ...liveDesk.event, starts_at: "2099-01-01T00:00:00Z" },
    });
    render(await AttendeesPage());
    expect(screen.getByText("Alex Rivera")).toBeInTheDocument();

    const search = screen.getByPlaceholderText(/search/i);
    fireEvent.change(search, { target: { value: "nonexistent-name-xyz" } });
    expect(screen.queryByText("Alex Rivera")).not.toBeInTheDocument();
    expect(screen.getByText(/no one in this list/i)).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "Rivera" } });
    expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
  });
});

describe("ContactNotePage", () => {
  it("renders the Marcus contact note with no session", async () => {
    render(await ContactNotePage({ params: Promise.resolve({ id: "marcus-ellis" }) }));
    expect(screen.getByRole("heading", { name: "Marcus Ellis" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /where you met/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy note/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy dm/i })).toBeInTheDocument();
    expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
  });

  it("renders a live guest by Engine id", async () => {
    loadDeskGuests.mockResolvedValue(liveDesk);
    render(
      await ContactNotePage({
        params: Promise.resolve({ id: "68d0e97d-4bfe-4142-996d-7ea1db58ed08" }),
      }),
    );
    expect(screen.getByRole("heading", { name: "Alex Rivera" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy note/i })).toBeInTheDocument();
  });

  it("404s an unknown attendee", async () => {
    await expect(
      ContactNotePage({ params: Promise.resolve({ id: "missing" }) }),
    ).rejects.toThrow("NOT_FOUND");
  });
});
