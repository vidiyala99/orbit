import { describe, it, expect } from "vitest";
import { resolveSignalTags } from "../signalTags";

describe("resolveSignalTags", () => {
  it("prefers stored API signals", () => {
    expect(
      resolveSignalTags({
        signals: ["Potentially hiring", "Just got funded"],
        role: "Founder",
        why: "Building something",
      }),
    ).toEqual(["Potentially hiring", "Just got funded"]);
  });

  it("infers from role and why when signals are missing", () => {
    expect(
      resolveSignalTags({
        signals: null,
        role: "Recruiter, infra",
        why: "Hiring PMs after a seed round",
      }),
    ).toEqual(["Potentially hiring", "Just got funded"]);
  });

  it("does not stamp Design partner on every AI role", () => {
    expect(
      resolveSignalTags({
        signals: null,
        role: "AI Engineer @ Bright Pattern",
        why: "As an AI Engineer at Bright Pattern, Sasha may offer relevant engineering insights.",
        priority: "needs_you",
      }),
    ).not.toContain("Design partner");
  });

  it("still tags explicit design-partner asks", () => {
    expect(
      resolveSignalTags({
        signals: null,
        role: "Founder",
        why: "Looking for a design partner who runs evals",
        priority: "needs_you",
      }),
    ).toContain("Design partner");
  });

  it("falls back to Warm intro, not Design partner, on thin bios", () => {
    expect(
      resolveSignalTags({
        signals: null,
        role: "Guest",
        why: "Here for the rooms",
        priority: "needs_you",
      }),
    ).toEqual(["Warm intro"]);
  });

  it("prefers live inference over weak filler-only stored chips", () => {
    expect(
      resolveSignalTags({
        signals: ["Design partner"],
        role: "AI Engineer @ Bright Pattern",
        why: "Engineering insights",
        priority: "needs_you",
      }),
    ).not.toContain("Design partner");
  });

  it("tags founders as Potentially hiring", () => {
    expect(
      resolveSignalTags({
        signals: null,
        role: "Co-Founder & CEO",
        why: "Building security tooling",
        priority: "later",
      }),
    ).toContain("Potentially hiring");
  });

  it("drops unknown labels", () => {
    expect(resolveSignalTags({ signals: ["Totally made up", "Investor"] })).toEqual(["Investor"]);
  });
});
