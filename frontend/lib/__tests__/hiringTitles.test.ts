import { describe, it, expect } from "vitest";
import { focusQueueScore, hasHiringTitle } from "../hiringTitles";

describe("hasHiringTitle", () => {
  it("matches founders and C-suite", () => {
    expect(hasHiringTitle("Co-Founder & CEO")).toBe(true);
    expect(hasHiringTitle("Founder, Acme")).toBe(true);
    expect(hasHiringTitle("CTO")).toBe(true);
    expect(hasHiringTitle("AI Engineer")).toBe(false);
  });
});

describe("focusQueueScore", () => {
  it("boosts hiring titles above raw embedding score", () => {
    expect(focusQueueScore({ score: 0.4, role: "Founder" })).toBeGreaterThan(
      focusQueueScore({ score: 0.4, role: "Engineer" }),
    );
  });
});
