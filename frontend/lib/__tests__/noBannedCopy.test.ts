import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = [
  join(import.meta.dirname, "../..", "app"),
  join(import.meta.dirname, "../..", "components"),
  join(import.meta.dirname, "../..", "lib"),
];

const BANNED = [
  "Map what's live around you",
  "research the room",
  "time-boxed plan",
  "Google OAuth maze",
  "One tap into the demo",
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    if (!/\.(tsx|ts|md)$/.test(name)) return [];
    if (name.includes("noBannedCopy.test")) return [];
    if (name.includes("page.test.tsx")) return [];
    return [path];
  });
}

describe("banned marketing copy", () => {
  it("does not appear in product source", () => {
    const files = ROOTS.flatMap(walk);
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const phrase of BANNED) {
        if (text.toLowerCase().includes(phrase.toLowerCase())) {
          hits.push(`${file}: ${phrase}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
