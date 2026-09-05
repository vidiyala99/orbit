import { describe, it, expect } from "vitest";
import { fixturePeople, fixturePlans, orFixtures } from "../demoFixtures";

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
});
