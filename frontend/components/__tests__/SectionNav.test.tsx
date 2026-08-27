import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import SectionNav from "../SectionNav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/today",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("SectionNav", () => {
  it("renders both the desktop top nav and the mobile tab bar", () => {
    render(<SectionNav />);
    // Both are always in the DOM; the breakpoint utilities pick one.
    expect(screen.getByRole("navigation", { name: /main/i }).className).toContain("md:flex");
    expect(screen.getByRole("navigation", { name: /sections/i }).className).toContain("md:hidden");
  });
});
