import { describe, it, expect } from "vitest";
import { personStatus } from "../orbit";

describe("personStatus", () => {
  it("uses the headline and falls back to Nearby", () => {
    expect(personStatus("Working in a cafe")).toBe("Working in a cafe");
    expect(personStatus("  ")).toBe("Nearby");
    expect(personStatus(null)).toBe("Nearby");
  });
});
