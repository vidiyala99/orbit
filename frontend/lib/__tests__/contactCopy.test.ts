import { describe, it, expect } from "vitest";
import { dm_payload, note_payload } from "../contactCopy";
import { fixtureAttendee } from "../demoFixtures";

const marcus = fixtureAttendee("marcus-ellis");

describe("contact copy", () => {
  it("builds note_payload from the stacked contact fields", () => {
    expect(marcus).toBeDefined();
    const text = note_payload(marcus!);
    expect(text).toContain("Hi Marcus");
    expect(text).toContain("Burning Token hackathon · Austin");
    expect(text).toContain("agentic tools");
    expect(text).toContain("same problem space");
    expect(text.toLowerCase()).not.toContain("send");
  });

  it("builds an interchangeable dm_payload from the same fields", () => {
    const text = dm_payload(marcus!);
    expect(text).toContain("Hey Marcus");
    expect(text).toContain("Burning Token hackathon · Austin");
    expect(text).toContain("same problem space");
    expect(text.toLowerCase()).not.toContain("send");
    expect(text).not.toEqual(note_payload(marcus!));
  });
});
