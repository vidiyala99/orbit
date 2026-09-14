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

  it("features the most recent event when every room is over, whatever was synced last", () => {
    const now = Date.parse("2026-09-20T00:00:00Z");
    const recent = evt({
      id: "recent",
      title: "Recent",
      starts_at: "2026-09-05T00:00:00Z",
      guest_count: 10,
      synced_at: "2026-09-01T00:00:00Z",
    });
    const olderButResynced = evt({
      id: "older",
      title: "Older",
      starts_at: "2026-09-02T00:00:00Z",
      guest_count: 5,
      synced_at: "2026-09-10T00:00:00Z",
    });
    const emptyNewest = evt({
      id: "empty",
      title: "Empty",
      starts_at: "2026-09-08T00:00:00Z",
      guest_count: 0,
      synced_at: "2026-09-11T00:00:00Z",
    });
    expect(pickFeaturedEvent([olderButResynced, recent, emptyNewest], now)?.id).toBe("recent");
  });

  it("the morning after the three demo events, features AI Security even though Build Fridays synced later", () => {
    const now = Date.parse("2026-09-14T01:05:00-07:00");
    const blinkko = evt({
      id: "blinkko",
      title: "Blinkko Launch Party",
      starts_at: "2026-09-10T18:00:00-07:00",
      ends_at: "2026-09-10T22:00:00-07:00",
      guest_count: 3,
      synced_at: "2026-09-13T05:47:45.424Z",
    });
    const buildFridays = evt({
      id: "build-fridays",
      title: "Build Fridays",
      starts_at: "2026-09-11T17:00:00-07:00",
      ends_at: "2026-09-11T21:00:00-07:00",
      guest_count: 236,
      synced_at: "2026-09-13T05:48:47.369Z",
    });
    const aiSecurity = evt({
      id: "ai-security",
      title: "AI Security Hackathon",
      starts_at: "2026-09-13T09:30:00-07:00",
      ends_at: "2026-09-13T19:30:00-07:00",
      guest_count: 553,
      synced_at: "2026-09-13T05:48:45.167Z",
    });
    expect(pickFeaturedEvent([buildFridays, blinkko, aiSecurity], now)?.id).toBe("ai-security");
  });

  it("breaks a start-time tie with the most recent sync", () => {
    const now = Date.parse("2026-09-20T00:00:00Z");
    const a = evt({ id: "a", title: "A", starts_at: "2026-09-05T00:00:00Z", guest_count: 4, synced_at: "2026-09-06T00:00:00Z" });
    const b = evt({ id: "b", title: "B", starts_at: "2026-09-05T00:00:00Z", guest_count: 4, synced_at: "2026-09-07T00:00:00Z" });
    expect(pickFeaturedEvent([a, b], now)?.id).toBe("b");
  });
});
