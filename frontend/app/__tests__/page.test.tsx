import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Page from "../page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

describe("Home page", () => {
  it("is the canonical split-hero landing: promise left, Needs you desk right", () => {
    render(<Page />);

    expect(
      screen.getByRole("heading", { name: "You shouldn't have to babysit follow-ups." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Personal communications manager - memory that closes the loop."),
    ).toBeInTheDocument();

    const tryIt = screen.getByRole("link", { name: /^try it$/i });
    expect(tryIt).toHaveAttribute("href", "/attendees");
    expect(tryIt.className).toMatch(/bg-lake/);
    expect(tryIt.className).not.toMatch(/bg-accent/);

    const openApp = screen.getByRole("link", { name: /^open app$/i });
    expect(openApp).toHaveAttribute("href", "/attendees");
    expect(openApp.className).toMatch(/border/);
    expect(openApp.className).not.toMatch(/bg-lake|bg-accent/);

    expect(screen.getByText("Remembers where you met + why it matters.")).toBeInTheDocument();
    expect(screen.getByText("Queues who Needs you first.")).toBeInTheDocument();
    expect(screen.getByText("Prepares Copy note / Copy DM you approve.")).toBeInTheDocument();
    expect(screen.getByTestId("proof-bookmark")).toBeInTheDocument();
    expect(screen.queryByTestId("proof-heart")).not.toBeInTheDocument();
    expect(screen.getByTestId("orbit-planet")).toBeInTheDocument();

    const desk = screen.getByTestId("needs-you-desk");
    expect(within(desk).getByRole("heading", { name: "Needs you" })).toBeInTheDocument();
    expect(within(desk).getByText("3 people - sorted by priority")).toBeInTheDocument();
    expect(within(desk).getAllByText("Copy note")).toHaveLength(3);
    expect(within(desk).getAllByText("Copy DM")).toHaveLength(3);
    expect(within(desk).getByText("Maya Chen")).toBeInTheDocument();
    expect(within(desk).getByText("Met at Design League · Apr 12")).toBeInTheDocument();
    expect(within(desk).getByText("Arjun Patel")).toBeInTheDocument();
    expect(within(desk).getByText("Met at Systems Dinner · May 3")).toBeInTheDocument();
    expect(within(desk).getByText("Elise Moreau")).toBeInTheDocument();
    expect(within(desk).getByText("Met at Research Forum · May 19")).toBeInTheDocument();
    expect(within(desk).getByText("Your desk - not another draft box.")).toBeInTheDocument();

    expect(document.body.textContent).not.toMatch(/\u2014/);
    expect(screen.queryByTestId("guest-proof")).not.toBeInTheDocument();
    expect(screen.queryByTestId("landing-preview")).not.toBeInTheDocument();
    expect(screen.queryByTestId("preview-pin")).not.toBeInTheDocument();
    expect(screen.queryByText(/café or hackathon/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/pick a place and a theme/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sophie Lin/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /how it works/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /product/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /pricing/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /how it works/i })).not.toBeInTheDocument();
  });
});
