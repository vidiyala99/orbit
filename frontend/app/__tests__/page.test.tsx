import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Page from "../page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

const H1 = "You shouldn't have to babysit follow-ups.";
const SUB = "Personal communications manager - memory that closes the loop.";
const CAPTION = "Your desk - not another draft box.";

describe("Home page", () => {
  it("is the canonical split-hero landing: promise left, Needs you desk right", () => {
    const { container } = render(<Page />);

    expect(screen.getByRole("heading", { name: H1 })).toBeInTheDocument();
    expect(screen.getByText(SUB)).toBeInTheDocument();
    expect(screen.getByText("Remembers where you met + why it matters.")).toBeInTheDocument();
    expect(screen.getByText("Queues who Needs you first.")).toBeInTheDocument();
    expect(screen.getByText("Prepares Copy note / Copy DM you approve.")).toBeInTheDocument();
    expect(screen.getByText(CAPTION)).toBeInTheDocument();

    const tryIt = screen.getByRole("link", { name: /^try it$/i });
    expect(tryIt).toHaveAttribute("href", "/attendees");
    expect(tryIt.className).toMatch(/bg-lake/);

    const openApp = screen.getByRole("link", { name: /^open app$/i });
    expect(openApp).toHaveAttribute("href", "/attendees");
    expect(openApp.className).toMatch(/border/);
    expect(openApp.className).not.toMatch(/bg-lake/);
    expect(openApp.className).not.toMatch(/bg-accent/);

    const desk = screen.getByTestId("needs-you-desk");
    expect(within(desk).getByText("Needs you")).toBeInTheDocument();
    expect(within(desk).getByText("3 people · sorted by priority")).toBeInTheDocument();
    expect(within(desk).getByText("Maya Chen")).toBeInTheDocument();
    expect(within(desk).getByText("Met at Design League · Apr 12")).toBeInTheDocument();
    expect(within(desk).getByText("Arjun Patel")).toBeInTheDocument();
    expect(within(desk).getByText("Met at Systems Dinner · May 3")).toBeInTheDocument();
    expect(within(desk).getByText("Elise Moreau")).toBeInTheDocument();
    expect(within(desk).getByText("Met at Research Forum · May 19")).toBeInTheDocument();

    const copyNotes = within(desk).getAllByText("Copy note");
    const copyDms = within(desk).getAllByText("Copy DM");
    expect(copyNotes).toHaveLength(3);
    expect(copyDms).toHaveLength(3);
    copyNotes.forEach((el) => expect(el.className).toMatch(/bg-lake/));
    copyDms.forEach((el) => {
      expect(el.className).toMatch(/border/);
      expect(el.className).not.toMatch(/bg-lake/);
    });

    expect(screen.getByTestId("proof-icon-bookmark")).toBeInTheDocument();
    expect(screen.queryByTestId("proof-icon-heart")).not.toBeInTheDocument();
    expect(container.querySelector('[data-icon="heart"]')).toBeNull();

    expect(screen.queryByRole("link", { name: /product/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /how it works/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /pricing/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("landing-preview")).not.toBeInTheDocument();
    expect(screen.queryByTestId("preview-pin")).not.toBeInTheDocument();
    expect(screen.queryByTestId("guest-proof")).not.toBeInTheDocument();
    expect(screen.queryByText(/café or hackathon/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/pick a place and a theme/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/looks like the guest list you already use/i)).not.toBeInTheDocument();

    const visible = container.textContent ?? "";
    expect(visible).not.toMatch(/[—–]/);
  });
});
