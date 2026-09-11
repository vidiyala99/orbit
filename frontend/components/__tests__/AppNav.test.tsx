import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AppNav from "../AppNav";
import * as auth from "@/lib/auth";

let mockPathname = "/home";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// AccountMenu fetches the signed-in user on mount; stub it out so these
// nav-shell tests don't hit the network.
vi.spyOn(auth, "ensureClientToken").mockResolvedValue(null);

describe("AppNav", () => {
  it("renders both tabs on /home", () => {
    mockPathname = "/home";
    render(<AppNav />);
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Attendees" })).toBeInTheDocument();
  });

  it("renders both tabs on a nested /attendees/:id route", () => {
    mockPathname = "/attendees/guest-123";
    render(<AppNav />);
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Attendees" })).toBeInTheDocument();
  });

  it("marks Home active on /home", () => {
    mockPathname = "/home";
    render(<AppNav />);
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Attendees" })).not.toHaveAttribute("aria-current");
  });

  it("marks Attendees active on /attendees and nested routes", () => {
    mockPathname = "/attendees/guest-123";
    render(<AppNav />);
    expect(screen.getByRole("link", { name: "Attendees" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("renders nothing on the marketing homepage", () => {
    mockPathname = "/";
    const { container } = render(<AppNav />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing on auth pages", () => {
    for (const path of [
      "/sign-in",
      "/sign-up",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
      "/onboarding",
    ]) {
      mockPathname = path;
      const { container, unmount } = render(<AppNav />);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });
});
