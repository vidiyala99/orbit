import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BottomTabNav from "../BottomTabNav";

const pathname = vi.fn<() => string>();
vi.mock("next/navigation", () => ({ usePathname: () => pathname() }));

beforeEach(() => {
  pathname.mockReturnValue("/today");
});

describe("BottomTabNav", () => {
  it("renders all four tabs pointing at their routes", () => {
    render(<BottomTabNav />);
    expect(screen.getByRole("link", { name: /wall/i })).toHaveAttribute("href", "/today");
    expect(screen.getByRole("link", { name: /map/i })).toHaveAttribute("href", "/map");
    expect(screen.getByRole("link", { name: /rooms/i })).toHaveAttribute("href", "/rooms");
    expect(screen.getByRole("link", { name: /chats/i })).toHaveAttribute("href", "/chats");
  });

  it("marks the tab matching the current route as current", () => {
    pathname.mockReturnValue("/rooms");
    render(<BottomTabNav />);
    expect(screen.getByRole("link", { name: /rooms/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /wall/i })).not.toHaveAttribute("aria-current");
  });

  it("treats a nested route as being inside its tab", () => {
    pathname.mockReturnValue("/rooms/abc-123");
    render(<BottomTabNav />);
    expect(screen.getByRole("link", { name: /rooms/i })).toHaveAttribute("aria-current", "page");
  });

  it("keeps /today active for the Wall tab and does not match unrelated routes", () => {
    pathname.mockReturnValue("/post");
    render(<BottomTabNav />);
    expect(screen.getByRole("link", { name: /wall/i })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: /map/i })).not.toHaveAttribute("aria-current");
  });

  it("is hidden from the md breakpoint up, where TopNav takes over", () => {
    render(<BottomTabNav />);
    expect(screen.getByRole("navigation").className).toContain("md:hidden");
  });

  it("tints the active tab with the accent color", () => {
    pathname.mockReturnValue("/map");
    render(<BottomTabNav />);
    const active = screen.getByRole("link", { name: /map/i });
    expect(active.className).toContain("text-ink");
    expect(active.querySelector("[data-tab-icon]")?.className).toContain("text-accent");
  });
});
