import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import MarketingNav from "../MarketingNav";

describe("MarketingNav", () => {
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
});
