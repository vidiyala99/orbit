import { describe, it, expect } from "vitest";
import { dmText, noteText } from "../contactCopy";
import { fixtureAttendee } from "../demoFixtures";

const marcus = fixtureAttendee("marcus-ellis");

describe("contact copy", () => {
  it("builds a follow-up note from the stacked contact fields", () => {
    expect(marcus).toBeDefined();
    const text = noteText(marcus!);
    expect(text).toContain("Hi Marcus");
    expect(text).toContain("Burning Token hackathon · Austin");
    expect(text).toContain("agentic tools");
    expect(text).toContain("same problem space");
    expect(text.toLowerCase()).not.toContain("send");
  });

  it("builds a tighter interchangeable DM from the same fields", () => {
    const text = dmText(marcus!);
    expect(text).toContain("Hey Marcus");
    expect(text).toContain("Burning Token hackathon · Austin");
    expect(text).toContain("same problem space");
    expect(text.toLowerCase()).not.toContain("send");
    expect(text).not.toEqual(noteText(marcus!));
  });
});
