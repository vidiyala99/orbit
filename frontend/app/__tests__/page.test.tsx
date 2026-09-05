import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Page from "../page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

describe("Home page", () => {
  it("renders the Orbit headline and demo CTA", async () => {
    const ui = await Page();
    render(ui);
    expect(screen.getByRole("heading", { name: /see who's nearby/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /enter demo/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /^sign in$/i })[0]).toHaveAttribute("href", "/sign-in");
  });

  it("lists map, organize, and research on the first-screen path", async () => {
    const ui = await Page();
    render(ui);
    expect(screen.getByText(/see the map/i)).toBeInTheDocument();
    expect(screen.getByText(/organize an event/i)).toBeInTheDocument();
    expect(screen.getAllByText(/research the room/i).length).toBeGreaterThan(0);
  });
});
