import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Page from "../page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

describe("Home page", () => {
  it("renders the Orbit headline and Try it out CTA", async () => {
    const ui = await Page();
    render(ui);
    expect(
      screen.getByRole("heading", { name: /bring people together around what's happening nearby/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /try it out/i }).length).toBeGreaterThan(0);
  });

  it("describes the category-to-nearby funnel", async () => {
    const ui = await Page();
    render(ui);
    expect(screen.getByText(/pick a category/i)).toBeInTheDocument();
    expect(screen.getByText(/see what's nearby/i)).toBeInTheDocument();
    expect(screen.getByText(/find people or start a room/i)).toBeInTheDocument();
  });
});
