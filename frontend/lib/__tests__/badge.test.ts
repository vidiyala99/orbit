import { describe, expect, it } from "vitest";
import { looksLikeBio, polishCopy, splitRole, toBadgePerson } from "../badge";
import type { PersonSummaryT } from "../events";

function person(overrides: Partial<PersonSummaryT>): PersonSummaryT {
  return {
    id: "p1",
    first_name: "Aditya",
    last_name: "Agrawal",
    role: "Founder & CEO - SuperU",
    priority: "needs_you",
    event_title: "AI Security Hackathon",
    event_ended_days_ago: 0,
    event_upcoming: false,
    why: "",
    note_payload: null,
    dm_payload: null,
    ...overrides,
  };
}

describe("splitRole", () => {
  it("splits title and company on explicit separators", () => {
    expect(splitRole("Founder & CEO - SuperU")).toEqual({ title: "Founder & CEO", company: "SuperU", bio: "" });
    expect(splitRole("Head of Security Engineering at Northwind Labs")).toEqual({
      title: "Head of Security Engineering",
      company: "Northwind Labs",
      bio: "",
    });
  });

  it("keeps short extra lines in the title", () => {
    expect(splitRole("investor @ elevation capital\nex-founder YC S22")).toEqual({
      title: "investor, ex-founder YC S22",
      company: "elevation capital",
      bio: "",
    });
  });

  it("never guesses a company from a pipe or a bio sentence", () => {
    expect(splitRole("Co-founder | CTO VisOS AI")).toEqual({ title: "Co-founder | CTO VisOS AI", company: null, bio: "" });
    const bio = "Hi guys, Im an Aspiring AI Enginner, have been using different ai models and figuring out a way to make it reliable and responsible.";
    expect(splitRole(bio).company).toBeNull();
  });

  it("moves a multi-line bio out of the title and keeps a labelled role", () => {
    const raw =
      "Just a chill guy looking for friends!\nPlays classical guitar.\nProfessionally: MLE; founder of PRAVIEL (ancient language learning app).";
    expect(splitRole(raw)).toEqual({
      title: "MLE; founder of PRAVIEL (ancient language learning app)",
      company: null,
      bio: "Just a chill guy looking for friends! Plays classical guitar.",
    });
  });

  it("gives a greeting bio no title at all", () => {
    const result = splitRole("Hi, I am Damien and I am 23 years old.\nBachelor: BSc Business Analytics.\nPremaster: Econometrics.");
    expect(result.title).toBe("");
    expect(result.bio).toMatch(/^Hi, I am Damien/);
    expect(result.bio).toContain("Premaster: Econometrics.");
  });

  it("puts a descriptive second line into the bio, not the title", () => {
    expect(splitRole("Founder & CEO @TasksMind\nCustomer retention infrastructure for production bugs")).toEqual({
      title: "Founder & CEO @TasksMind",
      company: null,
      bio: "Customer retention infrastructure for production bugs",
    });
  });

  it("handles empty roles", () => {
    expect(splitRole(null)).toEqual({ title: "", company: null, bio: "" });
  });
});

describe("looksLikeBio", () => {
  it("separates titles from sentences", () => {
    expect(looksLikeBio("Founder of FutrBridge, AI Engineer, Ex-Deloitte, PwC, Duke University Grad")).toBe(false);
    expect(looksLikeBio("Staff Engineer")).toBe(false);
    expect(looksLikeBio("Hi-Tech Sales Lead")).toBe(false);
    expect(looksLikeBio("A mindful innovator at the intersection of yoga and AI/ML.")).toBe(true);
    expect(looksLikeBio("Building AI products and meeting people working on agents!")).toBe(true);
    expect(looksLikeBio("I'm a Cybersecurity enthusiast")).toBe(true);
  });
});

describe("toBadgePerson", () => {
  it("maps researched evidence into approach, recent and background", () => {
    const badge = toBadgePerson(
      person({
        why: "CEO with a clear growth metric; hiring_power if you frame reliability.",
        signals: ["Potentially hiring", "Starting new startup"],
        evidence: [
          { source_id: "approach", quote: "1M calls on superU: what broke first when voice agents hit that scale?" },
          { source_id: "recent", quote: "superU Voice AI positioning: scalable agents powering over 1M calls." },
          { source_id: "about", quote: "I'm Aditya, the founder of superU." },
        ],
      }),
    );
    expect(badge.company).toBe("SuperU");
    expect(badge.title).toBe("Founder & CEO");
    expect(badge.approach).toContain("1M calls on superU");
    expect(badge.recent).toContain("powering over 1M calls");
    expect(badge.about).toBe("I'm Aditya, the founder of superU.");
    expect(badge.why).toContain("hiring opportunity");
    expect(badge.why).not.toContain("hiring_power");
    expect(badge.signals).toEqual(expect.arrayContaining(["Potentially hiring"]));
  });

  it("shows a bio from the role field as Background when there is no researched About", () => {
    const badge = toBadgePerson(
      person({ role: "Just a chill guy looking for friends!\nPlays classical guitar.\nProfessionally: MLE; founder of PRAVIEL." }),
    );
    expect(badge.title).toBe("MLE; founder of PRAVIEL");
    expect(badge.about).toBe("Just a chill guy looking for friends! Plays classical guitar.");
  });

  it("falls back to a role-based opener and leaves research empty when unresearched", () => {
    const badge = toBadgePerson(person({ role: "Staff Engineer", why: "Builds infra." }));
    expect(badge.approach.length).toBeGreaterThan(10);
    expect(badge.recent).toBeNull();
    expect(badge.about).toBeNull();
    expect(badge.company).toBeNull();
  });

  it("drops Why when it only repeats the approach line", () => {
    const line = "Ask which security seat is open and what good looks like in the first ninety days.";
    const badge = toBadgePerson(person({ why: line, evidence: [{ source_id: "approach", quote: line }] }));
    expect(badge.why).toBe("");
  });
});

describe("polishCopy", () => {
  it("replaces internal situation keys and collapses whitespace", () => {
    expect(polishCopy("a  warm_intro\nand founder_peer")).toBe("a warm intro and founder peer");
  });

  it("turns clause dashes into colons so product copy has no em dashes", () => {
    expect(polishCopy("1M calls on superU — what broke first?")).toBe("1M calls on superU: what broke first?");
    expect(polishCopy("co-founder, well–known")).toBe("co-founder, well–known");
  });

  it("drops the stray comma after a sentence mark", () => {
    expect(polishCopy("friends!, Plays classical guitar., and more")).toBe("friends! Plays classical guitar. and more");
  });
});
