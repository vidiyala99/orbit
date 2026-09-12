import { redirect } from "next/navigation";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AttendeesPage from "../page";
import type { AttendeesDataT } from "@/lib/events";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const loadAttendees = vi.fn();
vi.mock("@/lib/events", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/events")>();
  return {
    ...actual,
    loadAttendees: (...args: unknown[]) => loadAttendees(...args),
  };
});

const DATA: AttendeesDataT = {
  event: { id: "evt-1", title: "Build Fridays", location: null, guest_count: 2 },
  attendees: [],
};

describe("/attendees page", () => {
  beforeEach(() => {
    loadAttendees.mockReset();
    vi.mocked(redirect).mockReset();
  });

  it("redirects to the featured event guest list", async () => {
    loadAttendees.mockResolvedValue(DATA);
    await AttendeesPage();
    expect(redirect).toHaveBeenCalledWith("/events/evt-1");
  });

  it("redirects to /events when no featured event exists", async () => {
    loadAttendees.mockResolvedValue({ event: null, attendees: [] });
    await AttendeesPage();
    expect(redirect).toHaveBeenCalledWith("/events");
  });
});
