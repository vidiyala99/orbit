import { describe, it, expect } from "vitest";
import { guestHeadline } from "../guestHeadline";

describe("guestHeadline", () => {
  it("returns null for empty", () => {
    expect(guestHeadline("")).toBeNull();
    expect(guestHeadline(null)).toBeNull();
  });

  it("keeps a clean title-style role", () => {
    expect(guestHeadline("AI Product Builder")).toBe("AI Product Builder");
    expect(guestHeadline("Founder & AI Product Engineer")).toBe(
      "Founder & AI Product Engineer",
    );
  });

  it("turns comma tag piles into dotted headlines", () => {
    expect(guestHeadline("Network , AI , cyber security")).toBe(
      "Network · AI · cyber security",
    );
  });

  it("shortens pitchy bios to a lead phrase", () => {
    const h = guestHeadline(
      "Entrepreneur looking for cofounders for my AI next startup.",
    );
    expect(h).toBeTruthy();
    expect(h!.length).toBeLessThanOrEqual(72);
    expect(h).toMatch(/entrepreneur/i);
    expect(h).not.toMatch(/next startup/i);
  });

  it("does not invent companies", () => {
    expect(guestHeadline("Working on AI adoption")).toBe("Working on AI adoption");
  });
});
