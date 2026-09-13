import { describe, expect, it } from "vitest";
import { personYourAngle } from "../personYourAngle";

const focus = {
  role: "Founder building Actintro — event matchmaking + LLM-metered intros",
  struggle: "finding AI/security hiring managers, investors, and warm intros",
};

describe("personYourAngle", () => {
  it("returns null when Focus is empty", () => {
    expect(
      personYourAngle({
        focus: { role: null, struggle: null },
        signals: ["Investor"],
      }),
    ).toBeNull();
  });

  it("does not dump the full Focus struggle into the tip", () => {
    const tip = personYourAngle({
      focus,
      signals: ["Potentially hiring"],
      intent: "hiring_power",
      role: "CEO at Donely Security | Security for healthcare",
      recent: "Posted ~1w: Donely red-teamed / hacked an AI hacking company",
      personKey: "harsha",
    });
    expect(tip).toBeTruthy();
    expect(tip).not.toMatch(/finding AI\/security hiring managers/i);
    expect(tip).not.toMatch(/LLM-metered intros/i);
    expect(tip).toMatch(/Actintro/);
    expect(tip).toMatch(/red-?team|Donely/i);
  });

  it("differs across two hiring founders", () => {
    const harsha = personYourAngle({
      focus,
      signals: ["Potentially hiring"],
      role: "CEO at Donely Security",
      recent: "Posted ~1w: Donely red-teamed an AI hacking company",
      personKey: "p-harsha",
    });
    const aditya = personYourAngle({
      focus,
      signals: ["Potentially hiring"],
      role: "Founder & CEO - SuperU",
      recent: "superU Voice AI positioning: powering over 1M calls",
      personKey: "p-aditya",
    });
    expect(harsha).not.toEqual(aditya);
    expect(harsha).toMatch(/red-?team|Donely/i);
    expect(aditya).toMatch(/1M|calls|superU|SuperU/i);
  });

  it("names their shop for investors", () => {
    const tip = personYourAngle({
      focus,
      signals: ["Investor", "Warm intro"],
      intent: "investor",
      role: "Co-founder & Partner @ UpScaleX, seed fund on AI Applications",
      recent: "UpScaleX AI applications / agentic AI seed",
      personKey: "alan",
    });
    expect(tip).toMatch(/Actintro/);
    expect(tip).toMatch(/UpScaleX|agentic/i);
  });
});
