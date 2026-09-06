import { describe, it, expect } from "vitest";
import {
  FIXTURE_ATTENDEES,
  FIXTURE_EVENT,
  fixtureAttendee,
  fixturePeople,
  fixturePlans,
  orFixtures,
} from "../demoFixtures";

const origin = { city: "Austin, TX", lat: 30.2672, lon: -97.7431 };

describe("demo fixtures", () => {
  it("always seeds café, hackathon, and exploring people", () => {
    const people = fixturePeople(origin);
    expect(people.map((p) => p.status)).toEqual([
      "Working in a café",
      "At a hackathon",
      "Just exploring",
    ]);
  });

  it("seeds events for a theme around the picked city", () => {
    const plans = fixturePlans(origin, "tech");
    expect(plans.length).toBeGreaterThan(0);
    expect(plans.some((p) => /hack/i.test(p.detail ?? ""))).toBe(true);
  });

  it("keeps API rows when present and falls back when empty", () => {
    expect(orFixtures(["live"], ["fixture"])).toEqual(["live"]);
    expect(orFixtures([], ["fixture"])).toEqual(["fixture"]);
  });

  it("seeds a 12-guest Slice A brief with LinkedIn, X, and a why-meet line", () => {
    expect(FIXTURE_EVENT.title).toMatch(/nerdconf sf/i);
    expect(FIXTURE_ATTENDEES).toHaveLength(12);
    for (const row of FIXTURE_ATTENDEES) {
      expect(row.linkedin_url).toMatch(/^https:\/\//);
      expect(row.x_url).toMatch(/^https:\/\//);
      expect(row.why_meet.length).toBeGreaterThan(0);
      expect(row.note.where_met.length).toBeGreaterThan(0);
      expect(row.note.what_talked.length).toBeGreaterThan(0);
      expect(row.note.why.length).toBeGreaterThan(0);
      expect(["needs_you", "high", "later"]).toContain(row.priority);
    }
    expect(fixtureAttendee("marcus-ellis")?.role).toMatch(/render/i);
    expect(FIXTURE_ATTENDEES.some((row) => row.website_url)).toBe(true);
    expect(FIXTURE_ATTENDEES.filter((row) => row.priority === "needs_you").length).toBeGreaterThanOrEqual(5);
    expect(FIXTURE_ATTENDEES.some((row) => row.priority === "high")).toBe(true);
    expect(FIXTURE_ATTENDEES.some((row) => row.priority === "later")).toBe(true);
    expect(FIXTURE_ATTENDEES.every((row) => row.note_payload.length > 0 && row.dm_payload.length > 0)).toBe(
      true,
    );
    expect(FIXTURE_ATTENDEES.every((row) => row.note_payload !== row.dm_payload)).toBe(true);

    const alex = fixtureAttendee("alex-chen")!;
    expect(alex.priority).toBe("needs_you");
    expect(alex.linkedin_connected).toBe(true);
    expect(alex.x_interacted).toBe(true);

    const sam = fixtureAttendee("sam-ortiz")!;
    expect(sam.priority).toBe("high");
    expect(sam.linkedin_connected).toBe(false);
    expect(sam.x_interacted).toBe(true);

    const riley = fixtureAttendee("riley-cole")!;
    expect(riley.priority).toBe("later");
    expect(riley.linkedin_connected).toBe(true);
    expect(riley.x_interacted).toBe(false);

    expect(FIXTURE_ATTENDEES.some((row) => row.linkedin_connected && !row.x_interacted)).toBe(true);
    expect(FIXTURE_ATTENDEES.some((row) => row.x_interacted && !row.linkedin_connected)).toBe(true);
    expect(FIXTURE_ATTENDEES.some((row) => row.linkedin_connected && row.x_interacted)).toBe(true);
    expect(FIXTURE_ATTENDEES.every((row) => row.linkedin_connected && row.x_interacted)).toBe(false);
  });
});
