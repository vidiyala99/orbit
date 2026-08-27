import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TopNav from "../TopNav";

const pathname = vi.fn<() => string>();
const push = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => pathname(),
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

beforeEach(() => {
  pathname.mockReturnValue("/today");
});

describe("TopNav", () => {
  it("renders the wordmark linking home", () => {
    render(<TopNav />);
    expect(screen.getByRole("link", { name: /stayconnected/i })).toHaveAttribute("href", "/");
  });

  it("renders all four section links pointing at their routes", () => {
    render(<TopNav />);
    expect(screen.getByRole("link", { name: /wall/i })).toHaveAttribute("href", "/today");
    expect(screen.getByRole("link", { name: /map/i })).toHaveAttribute("href", "/map");
    expect(screen.getByRole("link", { name: /rooms/i })).toHaveAttribute("href", "/rooms");
    expect(screen.getByRole("link", { name: /chats/i })).toHaveAttribute("href", "/chats");
  });

  it("marks the link matching the current route as current and underlines it", () => {
    pathname.mockReturnValue("/rooms/abc-123");
    render(<TopNav />);
    const active = screen.getByRole("link", { name: /rooms/i });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(active.className).toContain("border-accent");
    expect(screen.getByRole("link", { name: /wall/i })).not.toHaveAttribute("aria-current");
  });

  it("offers sign out", () => {
    render(<TopNav />);
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("shows the user's initial in the avatar", () => {
    render(<TopNav userInitial="A" />);
    expect(screen.getByTestId("top-nav-avatar")).toHaveTextContent("A");
  });

  it("omits the avatar entirely when there is no initial to show", () => {
    // An empty disc next to "Sign out" reads as a broken image, not a person.
    render(<TopNav />);
    expect(screen.queryByTestId("top-nav-avatar")).toBeNull();
  });

  it("is hidden below the md breakpoint", () => {
    render(<TopNav />);
    expect(screen.getByRole("navigation").className).toContain("md:flex");
    expect(screen.getByRole("navigation").className).toContain("hidden");
  });
});
