import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Page from "../page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

describe("Home page", () => {
  it("is Landing v3: follow-up promise, Try it to /attendees, one guest-row, no map", () => {
    render(<Page />);

    expect(
      screen.getByRole("heading", { name: /you shouldn’t have to babysit follow-ups/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /personal communications manager — memory that closes the loop\. not a draft box/i,
      ),
    ).toBeInTheDocument();

    const tryIt = screen.getByRole("link", { name: /^try it$/i });
    expect(tryIt).toHaveAttribute("href", "/attendees");
    expect(tryIt.className).toMatch(/bg-accent/);

    const openApp = screen.getByRole("link", { name: /^open app$/i });
    expect(openApp).toHaveAttribute("href", "/attendees");
    expect(openApp.className).toMatch(/border/);
    expect(openApp.className).not.toMatch(/bg-accent/);

    expect(screen.getByTestId("guest-proof")).toBeInTheDocument();
    expect(screen.getByText("Sophie Lin")).toBeInTheDocument();
    expect(screen.getByText("Product at Linear")).toBeInTheDocument();
    expect(screen.getByText(/why meet: event sync, intros, co-hosting/i)).toBeInTheDocument();
    expect(screen.getByText(/looks like the guest list you already use/i)).toBeInTheDocument();

    expect(screen.queryByTestId("landing-preview")).not.toBeInTheDocument();
    expect(screen.queryByTestId("preview-pin")).not.toBeInTheDocument();
    expect(screen.queryByText(/café or hackathon/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/pick a place and a theme/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /how it works/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /how it works/i })).not.toBeInTheDocument();
  });
});
