import { describe, it, expect } from "vitest";
import { personApproachTip, roleArchetype } from "../personApproach";

describe("roleArchetype", () => {
  it("detects designer / engineer / founder", () => {
    expect(roleArchetype("Product Designer")).toBe("Designer");
    expect(roleArchetype("Staff Engineer")).toBe("Engineer");
    expect(roleArchetype("Founder, Guestline")).toBe("Founder");
  });
});

describe("personApproachTip", () => {
  it("gives designers, engineers, and founders different openers", () => {
    const designer = personApproachTip({ role: "Product Designer", why: "" });
    const engineer = personApproachTip({ role: "Backend Engineer", why: "" });
    const founder = personApproachTip({ role: "Founder", why: "" });
    expect(designer).not.toEqual(engineer);
    expect(engineer).not.toEqual(founder);
    expect(designer.toLowerCase()).toMatch(/craft|flow|design/);
    expect(engineer.toLowerCase()).toMatch(/technical|building|constraint/);
    expect(founder.toLowerCase()).toMatch(/problem|month/);
  });

  it("lets stored situational signals beat role", () => {
    const tip = personApproachTip({
      role: "Founder",
      signals: ["Potentially hiring"],
    });
    expect(tip.toLowerCase()).toMatch(/seat|hire|90/);
  });

  it("falls back to event kind when role is thin", () => {
    const tip = personApproachTip({
      role: "Guest",
      why: "",
      eventKind: "Hackathon",
    });
    expect(tip.toLowerCase()).toMatch(/tonight|building/);
  });
});
