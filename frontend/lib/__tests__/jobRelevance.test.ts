import { describe, expect, it } from "vitest";
import { computeJobRelevanceBoost } from "../jobRelevance";

describe("computeJobRelevanceBoost", () => {
  it("applies no boost when the user has no job target set", () => {
    const result = computeJobRelevanceBoost({ role: "Founder, Acme" }, null, null);
    expect(result).toEqual({ boost: 0, reason: null });
  });

  it("applies no boost when target_role is empty and target_industries is an empty array", () => {
    const result = computeJobRelevanceBoost({ role: "Founder, Acme" }, "", []);
    expect(result).toEqual({ boost: 0, reason: null });
  });

  it("boosts hiring-decision roles the highest, case-insensitively", () => {
    const result = computeJobRelevanceBoost({ role: "Head of Talent, Acme" }, "Product Manager", null);
    expect(result.reason).toBe("hiring");
    expect(result.boost).toBeGreaterThan(0);
  });

  it("recognizes a range of hiring-decision titles", () => {
    for (const role of ["Founder & CEO", "VP of Engineering", "Director of Product", "Head of People"]) {
      const result = computeJobRelevanceBoost({ role }, "Product Manager", null);
      expect(result.reason).toBe("hiring");
    }
  });

  it("boosts a target_role word match moderately", () => {
    const result = computeJobRelevanceBoost({ role: "Product Lead, Fieldstone" }, "Product Manager", null);
    expect(result.reason).toBe("relevant");
  });

  it("boosts a target_industries substring match moderately", () => {
    const result = computeJobRelevanceBoost({ role: "Engineer, Fintech Startup" }, null, ["fintech"]);
    expect(result.reason).toBe("relevant");
  });

  it("boosts a community-connector role slightly, as a warm-intro proxy", () => {
    const result = computeJobRelevanceBoost({ role: "Community Organizer" }, "Product Manager", ["fintech"]);
    expect(result.reason).toBe("connector");
    expect(result.boost).toBeGreaterThan(0);
  });

  it("applies no boost when nothing matches", () => {
    const result = computeJobRelevanceBoost({ role: "Barista" }, "Product Manager", ["fintech"]);
    expect(result).toEqual({ boost: 0, reason: null });
  });

  it("handles a missing role gracefully", () => {
    const result = computeJobRelevanceBoost({ role: null }, "Product Manager", ["fintech"]);
    expect(result).toEqual({ boost: 0, reason: null });
  });

  it("ranks hiring above relevance above connector above no-match", () => {
    const hiring = computeJobRelevanceBoost({ role: "Founder" }, "Product Manager", ["fintech"]);
    const relevant = computeJobRelevanceBoost({ role: "Product Lead" }, "Product Manager", ["fintech"]);
    const connector = computeJobRelevanceBoost({ role: "Community Host" }, "Product Manager", ["fintech"]);
    const none = computeJobRelevanceBoost({ role: "Barista" }, "Product Manager", ["fintech"]);
    expect(hiring.boost).toBeGreaterThan(relevant.boost);
    expect(relevant.boost).toBeGreaterThan(connector.boost);
    expect(connector.boost).toBeGreaterThan(none.boost);
  });
});
