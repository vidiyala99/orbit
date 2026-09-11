import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import MarketingNav from "../MarketingNav";

describe("MarketingNav", () => {
  beforeEach(() => {
    document.cookie = "sc_token=; path=/; max-age=0";
  });

  it("links the wordmark home and has no pre-Orbit marketing pages", () => {
    render(<MarketingNav />);
    expect(screen.getByRole("link", { name: "Orbit" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("link", { name: /how it works/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /about/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /menu/i })).not.toBeInTheDocument();
  });

  it("shows a Sign in link when signed out", () => {
    render(<MarketingNav />);
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/sign-in");
    expect(screen.queryByRole("link", { name: /^open app$/i })).not.toBeInTheDocument();
  });

  it("shows an Open app link to /home when a session token is present", async () => {
    document.cookie = "sc_token=tok123; path=/";
    render(<MarketingNav />);
    expect(await screen.findByRole("link", { name: /^open app$/i })).toHaveAttribute("href", "/home");
    expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument();
  });
});
