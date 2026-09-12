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

  it("tags AI product builders from thin Luma bios", () => {
    expect(
      resolveSignalTags({
        signals: null,
        role: "AI Product Builder",
        why: "As an AI Product Builder, Tanvish can share practical insights on building and deploying AI products.",
        priority: "needs_you",
      }),
    ).toEqual(["Starting new startup", "Looking for beta testers", "Design partner"]);
  });

  it("drops unknown labels", () => {
    expect(resolveSignalTags({ signals: ["Totally made up", "Investor"] })).toEqual(["Investor"]);
  });
});
