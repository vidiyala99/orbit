import { describe, it, expect } from "vitest";
import {
  avatarCandidates,
  hasFocusSocialProof,
  isFocusWorthyGuest,
  linkedInSlugFromUrl,
} from "../avatarCandidates";

describe("linkedInSlugFromUrl", () => {
  it("parses /in/ slugs", () => {
    expect(linkedInSlugFromUrl("https://www.linkedin.com/in/abhijit-betigeri")).toBe(
      "abhijit-betigeri",
    );
  });
});

describe("avatarCandidates", () => {
  it("prefers Luma then LinkedIn, never X", () => {
    expect(
      avatarCandidates({
        avatar_url: "https://images.lumacdn.com/a.jpg",
        linkedin_url: "https://www.linkedin.com/in/alex",
      }),
    ).toEqual([
      "https://images.lumacdn.com/a.jpg",
      "https://unavatar.io/linkedin/alex?fallback=false",
    ]);
  });

  it("uses LinkedIn when Luma photo is missing", () => {
    expect(
      avatarCandidates({
        avatar_url: null,
        linkedin_url: "https://www.linkedin.com/in/abhijit-betigeri",
      }),
    ).toEqual(["https://unavatar.io/linkedin/abhijit-betigeri?fallback=false"]);
  });
});

describe("hasFocusSocialProof", () => {
  it("accepts LinkedIn or real avatar", () => {
    expect(hasFocusSocialProof({ linkedin_url: "https://linkedin.com/in/a" })).toBe(true);
    expect(hasFocusSocialProof({ avatar_url: "https://cdn.example/p.jpg" })).toBe(true);
    expect(hasFocusSocialProof({ avatar_url: null, linkedin_url: null })).toBe(false);
  });
});

describe("isFocusWorthyGuest", () => {
  it("keeps real roles with LinkedIn", () => {
    expect(
      isFocusWorthyGuest({
        linkedin_url: "https://linkedin.com/in/sasha",
        role: "AI Engineer @ Bright Pattern",
      }),
    ).toBe(true);
  });

  it("drops comma tag piles even when LinkedIn exists", () => {
    expect(
      isFocusWorthyGuest({
        linkedin_url: "https://linkedin.com/in/amaha",
        role: "Network , AI , cyber security",
      }),
    ).toBe(false);
  });
});
