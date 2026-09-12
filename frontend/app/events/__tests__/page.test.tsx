import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import EventsPage from "../page";
import EventDetailPage from "../[id]/page";
import type { AttendeesDataT, EventT } from "@/lib/events";

const loadEvents = vi.fn();
const loadEventAttendees = vi.fn();
vi.mock("@/lib/events", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/events")>();
  return {
    ...actual,
    loadEvents: (...args: unknown[]) => loadEvents(...args),
    loadEventAttendees: (...args: unknown[]) => loadEventAttendees(...args),
  };
});

const EVENTS: EventT[] = [
  {
    id: "evt-1",
    title: "Build Fridays",
    source_url: null,
    location: "SOMA",
    starts_at: "2026-09-10T18:00:00Z",
    ends_at: null,
    guest_count: 42,
    synced_at: "2026-09-11T00:00:00Z",
    shortlist_count: 3,
  },
];

const GUESTS: AttendeesDataT = {
  event: { id: "evt-1", title: "Build Fridays", location: "SOMA", guest_count: 2 },
  attendees: [
    {
      id: "a",
      name: "Pat Lee",
      role: "HM at Facebook",
      why: "",
      priority: "later",
      score: null,
      avatar_url: null,
      linkedin_url: null,
      x_url: null,
      triage_state: null,
    },
    {
      id: "b",
      name: "Jordan Kim",
      role: "SWE seeking roles",
      why: "",
      priority: "needs_you",
      score: 0.8,
      avatar_url: null,
      linkedin_url: null,
      x_url: null,
      triage_state: null,
    },
  ],
};

describe("/events pages", () => {
  beforeEach(() => {
    loadEvents.mockReset();
    loadEventAttendees.mockReset();
  });

  it("lists synced events", async () => {
    loadEvents.mockResolvedValue(EVENTS);
    render(await EventsPage());
    expect(screen.getByRole("heading", { name: /^events$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /build fridays/i })).toHaveAttribute(
      "href",
      "/events/evt-1",
    );
  });

  it("loads guests for /events/:id", async () => {
    loadEventAttendees.mockResolvedValue(GUESTS);
    render(await EventDetailPage({ params: Promise.resolve({ id: "evt-1" }) }));
    expect(loadEventAttendees).toHaveBeenCalledWith("evt-1");
    expect(screen.getByRole("heading", { name: /build fridays/i })).toBeInTheDocument();
    // Best (default) is Focus shortlist — only scored needs_you matches.
    expect(screen.getByText("Jordan Kim")).toBeInTheDocument();
    expect(screen.queryByText("Pat Lee")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /everyone/i }));
    expect(screen.getByText("Pat Lee")).toBeInTheDocument();
  });
});
