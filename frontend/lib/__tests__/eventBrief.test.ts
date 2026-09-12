import { describe, it, expect } from "vitest";
import { eventBrief } from "../eventBrief";

describe("eventBrief", () => {
  it("classifies hackathons", () => {
    expect(eventBrief("DevN & Data Hackathon").kind).toBe("Hackathon");
  });

  it("classifies product launches", () => {
    const brief = eventBrief("Blinkko Launch Party");
    expect(brief.kind).toBe("Product launch");
    expect(brief.approach.toLowerCase()).toMatch(/launch/);
  });

  it("classifies build fridays co-hosts as builder workshops", () => {
    expect(eventBrief("build fridays sf x sentry").kind).toBe("Builder workshop");
  });

  it("classifies pitch nights", () => {
    expect(eventBrief("Seed Pitch Night").kind).toBe("Pitch event");
  });

  it("falls back to community night", () => {
    expect(eventBrief("Tuesday at the warehouse").kind).toBe("Community night");
  });
});
