import { describe, it, expect } from "vitest";
import { hasRelevanceSignal } from "../relevanceSignal";

describe("hasRelevanceSignal", () => {
  it("is true for a genuine relevance signal", () => {
    expect(
      hasRelevanceSignal(
        "is highly relevant to someone targeting an AI Engineering role as he is actively building AI agents",
      ),
    ).toBe(true);
  });

  it("is false for 'does not appear to be a public professional figure'", () => {
    expect(
      hasRelevanceSignal(
        "does not appear to be a public professional figure in any of the available sources, so there is no relevance",
      ),
    ).toBe(false);
  });

  it("is false for 'No evidence found that ... is relevant'", () => {
    expect(hasRelevanceSignal("No evidence found that Sam Okonkwo is relevant...")).toBe(false);
  });

  it("is false for 'does not indicate' phrasing", () => {
    expect(hasRelevanceSignal("Available research does not indicate any relevance to your role.")).toBe(
      false,
    );
  });

  it("is false for 'no public signal(s)' phrasing", () => {
    expect(hasRelevanceSignal("There is no public signal connecting them to your target industries.")).toBe(
      false,
    );
  });

  it("is false for empty, whitespace, null, or undefined text", () => {
    expect(hasRelevanceSignal("")).toBe(false);
    expect(hasRelevanceSignal("   ")).toBe(false);
    expect(hasRelevanceSignal(null)).toBe(false);
    expect(hasRelevanceSignal(undefined)).toBe(false);
  });
});
