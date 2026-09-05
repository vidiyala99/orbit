import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import MarketingNav from "../MarketingNav";

describe("MarketingNav", () => {
  beforeEach(() => {
    document.cookie = "sc_token=; path=/; max-age=0";
  });

  it("renders links to all three marketing pages with real hrefs", () => {
    render(<MarketingNav active="home" />);
    expect(screen.getAllByRole("link", { name: "Home" })[0]).toHaveAttribute("href", "/");
    expect(screen.getAllByRole("link", { name: "How it works" })[0]).toHaveAttribute("href", "/how-it-works");
    expect(screen.getAllByRole("link", { name: "About" })[0]).toHaveAttribute("href", "/about");
  });

  it("marks the active page's link", () => {
    render(<MarketingNav active="how-it-works" />);
    expect(screen.getAllByRole("link", { name: "How it works" })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link", { name: "Home" })[0]).not.toHaveAttribute("aria-current");
  });

  it("toggles the mobile drawer via the hamburger button", () => {
    render(<MarketingNav active="home" />);
    const toggle = screen.getByRole("button", { name: /menu/i });
    expect(screen.getByTestId("mobile-drawer")).not.toBeVisible();
    fireEvent.click(toggle);
    expect(screen.getByTestId("mobile-drawer")).toBeVisible();
  });

  it("shows a Sign in link in both the desktop nav and mobile drawer when signed out", () => {
    render(<MarketingNav active="home" />);
    fireEvent.click(screen.getByRole("button", { name: /menu/i }));
    const links = screen.getAllByRole("link", { name: /sign in/i });
    expect(links).toHaveLength(2);
    links.forEach((link) => expect(link).toHaveAttribute("href", "/sign-in"));
    expect(screen.queryByRole("link", { name: /^map$/i })).not.toBeInTheDocument();
  });

  it("shows a Map link instead of Sign in when a session token is present", async () => {
    document.cookie = "sc_token=tok123; path=/";
    render(<MarketingNav active="home" />);
    fireEvent.click(screen.getByRole("button", { name: /menu/i }));
    const links = await screen.findAllByRole("link", { name: /^map$/i });
    expect(links).toHaveLength(2);
    links.forEach((link) => expect(link).toHaveAttribute("href", "/map"));
    expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument();
  });
});
