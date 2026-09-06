import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import AttendeeBrief from "../AttendeeBrief";
import { FIXTURE_ATTENDEES, FIXTURE_EVENT } from "@/lib/demoFixtures";

function renderBrief() {
  return render(<AttendeeBrief event={FIXTURE_EVENT} attendees={FIXTURE_ATTENDEES} />);
}

describe("AttendeeBrief", () => {
  it("renders the event header, datetime, and guest count", () => {
    renderBrief();
    expect(screen.getByRole("heading", { name: /nerdconf sf — sat/i })).toBeInTheDocument();
    expect(screen.getByText(/saturday, june 7, 2025/i)).toBeInTheDocument();
    expect(screen.getByText(/12 guests/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back/i })).toHaveAttribute("href", "/");
  });

  it("renders a row card with avatar, name, role, socials, and mono why-meet", () => {
    renderBrief();
    expect(screen.getByText("Alex Chen")).toBeInTheDocument();
    expect(screen.getByText("Founder, Render")).toBeInTheDocument();
    const why = screen.getByText(/building agent infra/i);
    expect(why.className).toMatch(/font-mono/);
    expect(why.className).toMatch(/italic/);
    expect(screen.getByRole("link", { name: /alex chen on linkedin/i })).toHaveAttribute(
      "href",
      expect.stringContaining("linkedin.com"),
    );
    expect(screen.getByRole("link", { name: /alex chen on x/i })).toHaveAttribute(
      "href",
      expect.stringContaining("x.com"),
    );
    expect(screen.getByRole("link", { name: /alex chen website/i })).toBeInTheDocument();
  });

  it("opens the contact note from the row, without a new nav shell", () => {
    renderBrief();
    expect(screen.getByRole("link", { name: "Marcus Ellis" })).toHaveAttribute(
      "href",
      "/attendees/marcus-ellis",
    );
    expect(screen.queryByRole("navigation", { name: /sections|main/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /today|capture|outreach/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/response likelihood/i)).not.toBeInTheDocument();
  });

  it("marks each guest as a 14px card surface", () => {
    const { container } = renderBrief();
    const row = within(container).getByText("Alex Chen").closest("li");
    expect(row?.className).toMatch(/rounded-card/);
    expect(row?.className).toMatch(/bg-surface/);
  });

  it("spaces rows on an 8pt paper rhythm instead of a dense stack", () => {
    const { container } = renderBrief();
    const list = container.querySelector("ul");
    expect(list?.className).toMatch(/gap-4/);
    expect(screen.getByRole("main").className).toMatch(/px-6/);
  });
});
