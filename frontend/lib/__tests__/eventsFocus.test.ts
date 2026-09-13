import { describe, it, expect } from "vitest";
import { eventFocusEndsAt, isFocusEvent, pickFeaturedEvent, type EventT } from "../events";

function evt(partial: Partial<EventT> & Pick<EventT, "id" | "title" | "starts_at">): EventT {
  return {
    source_url: null,
    location: null,
    ends_at: null,
    guest_count: 0,
    synced_at: null,
    shortlist_count: 0,
    ...partial,
  };
}

describe("isFocusEvent", () => {
  it("stays live after starts_at when ends_at is missing", () => {
    const start = Date.now() - 30 * 60 * 1000;
    expect(
      isFocusEvent({ starts_at: new Date(start).toISOString(), ends_at: null }),
    ).toBe(true);
  });

  it("ends six hours after start without ends_at", () => {
    const start = Date.now() - 7 * 60 * 60 * 1000;
    expect(
      isFocusEvent({ starts_at: new Date(start).toISOString(), ends_at: null }),
    ).toBe(false);
  });

  it("uses ends_at when present", () => {
    const start = Date.now() - 2 * 60 * 60 * 1000;
    const end = Date.now() + 60 * 60 * 1000;
    expect(
      isFocusEvent({
        starts_at: new Date(start).toISOString(),
        ends_at: new Date(end).toISOString(),
      }),
    ).toBe(true);
    expect(eventFocusEndsAt({ starts_at: new Date(start).toISOString(), ends_at: new Date(end).toISOString() })).toBe(
      end,
    );
  });
});

describe("pickFeaturedEvent", () => {
  it("prefers the soonest focus-window event with guests over a newer sync that already ended", () => {
    const now = Date.parse("2026-09-12T20:00:00-07:00");
    const pastLive = evt({
      id: "past",
      title: "Build Fridays",
      starts_at: "2026-09-12T17:00:00.000Z", // 10am PT — already past 6h focus window by 8pm PT
      guest_count: 236,
      synced_at: "2026-09-12T18:00:00.000Z",
    });
    const tomorrow = evt({
      id: "hack",
      title: "AI Security Hackathon",
      starts_at: "2026-09-13T16:30:00.000Z", // 9:30am PT tomorrow
      guest_count: 553,
      synced_at: "2026-09-12T19:00:00.000Z",
    });
    expect(pickFeaturedEvent([pastLive, tomorrow], now)?.id).toBe("hack");
  });

  it("falls back to latest synced_at when nothing is in the Focus window", () => {
    const now = Date.parse("2026-09-20T00:00:00Z");
    const older = evt({
      id: "a",
      title: "Old",
      starts_at: "2026-09-01T00:00:00Z",
      guest_count: 10,
      synced_at: "2026-09-01T00:00:00Z",
    });
    const newer = evt({
      id: "b",
      title: "New",
      starts_at: "2026-09-02T00:00:00Z",
      guest_count: 5,
      synced_at: "2026-09-10T00:00:00Z",
    });
    const empty = evt({
      id: "c",
      title: "Empty",
      starts_at: "2026-09-03T00:00:00Z",
      guest_count: 0,
      synced_at: "2026-09-11T00:00:00Z",
    });
    expect(pickFeaturedEvent([older, newer, empty], now)?.id).toBe("b");
  });
});
