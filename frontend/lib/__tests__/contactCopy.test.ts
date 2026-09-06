import { describe, it, expect } from "vitest";
import { emailText, linkedInNoteText } from "../contactCopy";
import { fixtureAttendee } from "../demoFixtures";

const marcus = fixtureAttendee("marcus-ellis");

describe("contact copy", () => {
  it("builds a LinkedIn note from the stacked contact fields", () => {
    expect(marcus).toBeDefined();
    const text = linkedInNoteText(marcus!);
    expect(text).toContain("Hi Marcus");
    expect(text).toContain("Burning Token hackathon · Austin");
    expect(text).toContain("agentic tools");
    expect(text).toContain("same problem space");
    expect(text.toLowerCase()).not.toContain("send");
  });

  it("builds a plain email from the same fields", () => {
    const text = emailText(marcus!);
    expect(text.startsWith("Hi Marcus,")).toBe(true);
    expect(text).toContain("We met at Burning Token hackathon · Austin.");
    expect(text).toContain("Best");
  });
});
