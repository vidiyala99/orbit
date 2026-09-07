import { describe, it, expect } from "vitest";
import { FIXTURE_ATTENDEES, FIXTURE_EVENT, fixtureAttendee } from "../demoFixtures";

describe("demo fixtures", () => {
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
