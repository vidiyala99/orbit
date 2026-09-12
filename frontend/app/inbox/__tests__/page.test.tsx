import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import InboxPage from "../page";
import PersonPage from "../../people/[id]/page";
import { FIXTURE_ATTENDEES, FIXTURE_EVENT } from "@/lib/demoFixtures";
import type { DeskGuests } from "@/lib/guests";
import type { InboxPersonT } from "@/lib/events";

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

const loadInbox = vi.fn();
vi.mock("@/lib/events", async () => {
  const actual = await vi.importActual<typeof import("@/lib/events")>("@/lib/events");
  return {
    ...actual,
    loadInbox: (...args: unknown[]) => loadInbox(...args),
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

const inboxPeople: InboxPersonT[] = [
  {
    id: "kept-1",
    first_name: "Tanvish",
    last_name: "",
    role: "AI Product Builder",
    why: "Building agents in your space",
    avatar_url: null,
    event_title: "Build Fridays SF X Sentry",
    triaged_at: "2026-09-11T00:00:00Z",
    email: "tanvish@orbit.demo",
    email_body: "Hi Tanvish,\n\nGreat meeting you at Build Fridays SF X Sentry.",
    dm_body: "Hey Tanvish — enjoyed meeting you at Build Fridays.",
  },
];

beforeEach(() => {
  notFound.mockClear();
  loadDeskGuests.mockReset();
  loadDeskGuests.mockResolvedValue(fixtureDesk);
  loadInbox.mockReset();
  loadInbox.mockResolvedValue([]);
});

describe("InboxPage", () => {
  it("renders the empty Inbox state", async () => {
    render(await InboxPage());
    expect(screen.getByRole("heading", { name: /^inbox$/i })).toBeInTheDocument();
    expect(screen.getByText(/empty for now/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute("href", "/home");
  });

  it("lists kept people with sample outreach and draft actions", async () => {
    loadInbox.mockResolvedValue(inboxPeople);
    render(await InboxPage());
    expect(screen.getByText("Tanvish")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^tanvish$/i })).toHaveAttribute("href", "/people/kept-1");
    expect(screen.getByText(/sample email/i)).toBeInTheDocument();
    expect(screen.getByText("tanvish@orbit.demo")).toBeInTheDocument();
    expect(screen.getByText(/sample dm/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /draft email/i })).toHaveAttribute(
      "href",
      expect.stringMatching(/^mailto:/),
    );
    expect(screen.getByRole("button", { name: /copy dm/i })).toBeInTheDocument();
  });
});

describe("PersonPage", () => {
  it("renders the Marcus contact note", async () => {
    render(
      await PersonPage({
        params: Promise.resolve({ id: "marcus-ellis" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByRole("heading", { name: "Marcus Ellis" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to inbox/i })).toHaveAttribute("href", "/inbox");
  });

  it("backs to Home when opened from Focus", async () => {
    render(
      await PersonPage({
        params: Promise.resolve({ id: "marcus-ellis" }),
        searchParams: Promise.resolve({ from: "home" }),
      }),
    );
    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute("href", "/home");
  });

  it("renders a live guest by id", async () => {
    loadDeskGuests.mockResolvedValue(liveDesk);
    render(
      await PersonPage({
        params: Promise.resolve({ id: "68d0e97d-4bfe-4142-996d-7ea1db58ed08" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByRole("heading", { name: "Alex Rivera" })).toBeInTheDocument();
  });

  it("404s an unknown person", async () => {
    await expect(
      PersonPage({
        params: Promise.resolve({ id: "missing" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NOT_FOUND");
  });
});
