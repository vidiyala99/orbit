import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AppNav from "../AppNav";
import * as auth from "@/lib/auth";

let mockPathname = "/home";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.spyOn(auth, "ensureClientToken").mockResolvedValue(null);

describe("AppNav", () => {
  it("renders Home, Events, and Inbox tabs on /events", () => {
    mockPathname = "/events";
    render(<AppNav />);
    expect(screen.getByRole("tab", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Events" })).toHaveAttribute("href", "/events");
    expect(screen.queryByRole("tab", { name: "Attendees" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Inbox" })).toHaveAttribute("href", "/inbox");
  });

  it("marks Events active on /events and /events/:id", () => {
    mockPathname = "/events";
    const { unmount } = render(<AppNav />);
    expect(screen.getByRole("tab", { name: "Events" })).toHaveAttribute("aria-current", "page");
    unmount();

    mockPathname = "/events/evt-1";
    render(<AppNav />);
    expect(screen.getByRole("tab", { name: "Events" })).toHaveAttribute("aria-current", "page");
  });

  it("marks Inbox active only on /inbox, not on /people/:id", () => {
    mockPathname = "/inbox";
    const { unmount } = render(<AppNav />);
    expect(screen.getByRole("tab", { name: "Inbox" })).toHaveAttribute("aria-current", "page");
    unmount();

    mockPathname = "/people/guest-123";
    render(<AppNav />);
    expect(screen.getByRole("tab", { name: "Inbox" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("tab", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("still shows app chrome on /people/:id", () => {
    mockPathname = "/people/guest-123";
    render(<AppNav />);
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
  });

  it("renders nothing on /home, which draws its own header and tabs", () => {
    mockPathname = "/home";
    const { container } = render(<AppNav />);
    expect(container).toBeEmptyDOMElement();
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

  it("uses a distinct raised top chrome with a tab group", () => {
    mockPathname = "/inbox";
    const { container } = render(<AppNav />);
    const nav = container.querySelector("nav");
    expect(nav?.className).toMatch(/border-b/);
    expect(nav?.className).toMatch(/surface-raised/);
    expect(nav?.className).not.toMatch(/order-2/);
    expect(screen.getByRole("tablist", { name: /app sections/i })).toBeInTheDocument();
  });
});
