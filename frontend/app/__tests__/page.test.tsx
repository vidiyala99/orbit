import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Page from "../page";

describe("Home page", () => {
  it("renders the headline, no eyebrow, and both hero CTAs", async () => {
    const ui = await Page();
    render(ui);
    expect(screen.getByRole("heading", { name: /networking used to run on luck/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /join the waitlist/i })[0]).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see how it works/i })).toHaveAttribute("href", "/how-it-works");
  });

  it("renders the three-step summary and thesis quote", async () => {
    const ui = await Page();
    render(ui);
    expect(screen.getByText(/post where you'll be/i)).toBeInTheDocument();
    expect(screen.getByText(/leave with a stamp, not just an add/i)).toBeInTheDocument();
    expect(screen.getByText(/nobody has time to network with everyone/i)).toBeInTheDocument();
  });
});
