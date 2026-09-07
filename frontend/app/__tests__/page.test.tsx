import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Page from "../page";
import { FIXTURE_ATTENDEES, attendeeName } from "@/lib/demoFixtures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

const H1 = "You shouldn't have to babysit follow-ups.";
const SUB = "Personal communications manager - memory that closes the loop.";
const CAPTION = "Your desk - not another draft box.";

describe("Home page", () => {
  it("renders the hero: promise left, Needs you desk right", () => {
    render(<Page />);

    expect(screen.getByRole("heading", { name: H1 })).toBeInTheDocument();
    expect(screen.getByText(SUB)).toBeInTheDocument();
    expect(screen.getByText("Remembers where you met + why it matters.")).toBeInTheDocument();
    expect(screen.getByText("Queues who needs you first.")).toBeInTheDocument();
    expect(screen.getByText("Prepares Copy note / Copy DM you approve.")).toBeInTheDocument();
    expect(screen.getByText(CAPTION)).toBeInTheDocument();

    const tryItLinks = screen.getAllByRole("link", { name: /^try it$/i });
    tryItLinks.forEach((link) => expect(link).toHaveAttribute("href", "/attendees"));

    const desk = screen.getByTestId("needs-you-desk");
    const deskPeople = FIXTURE_ATTENDEES.slice(0, 3);
    deskPeople.forEach((row) => {
      expect(within(desk).getByText(attendeeName(row))).toBeInTheDocument();
    });
  });

  it("tells the whole story below the fold: problem, how it works, features, proof, FAQ, closing CTA", () => {
    render(<Page />);

    expect(screen.getByText(/the best conversations end at the door/i)).toBeInTheDocument();
    expect(screen.getByText("Connect the guest list")).toBeInTheDocument();
    expect(screen.getByText("It ranks who needs you first")).toBeInTheDocument();
    expect(screen.getByText("Copy the note it already wrote")).toBeInTheDocument();
    expect(screen.getByText("Needs you, ranked")).toBeInTheDocument();
    expect(screen.getByText("Evidence, not guesses")).toBeInTheDocument();
    expect(screen.getByText(/you already meet the right people/i)).toBeInTheDocument();
    expect(screen.getByText("NERDCONF SF")).toBeInTheDocument();
    expect(screen.getByText("Is this another CRM?")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /try it before your next event/i })).toBeInTheDocument();
  });
});
