import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ContactNote from "../ContactNote";
import { dm_payload, note_payload } from "@/lib/contactCopy";
import { fixtureAttendee } from "@/lib/demoFixtures";

const marcus = fixtureAttendee("marcus-ellis")!;
const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  writeText.mockClear();
  Object.assign(navigator, { clipboard: { writeText } });
});

describe("ContactNote", () => {
  it("stacks where / talked / why and offers the Copy note + Copy DM duo only", () => {
    render(<ContactNote attendee={marcus} />);
    expect(screen.getByRole("heading", { name: "Marcus Ellis" })).toBeInTheDocument();
    expect(screen.getByText("Founding Engineer at Render")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
      "href",
      marcus.linkedin_url,
    );
    expect(screen.getByText("LI")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "X" })).toHaveAttribute("href", marcus.x_url);
    expect(screen.getByRole("heading", { name: /where you met/i })).toBeInTheDocument();
    expect(screen.getByText(/burning token hackathon · austin/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /what you talked about/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /why it matters/i })).toBeInTheDocument();
    const why = screen.getByText(/same problem space/i);
    expect(why.className).toMatch(/italic/);
    const note = screen.getByRole("button", { name: /^copy note$/i });
    const dm = screen.getByRole("button", { name: /^copy dm$/i });
    expect(note.className).toMatch(/bg-accent/);
    expect(dm.className).toMatch(/border-rule/);
    expect(note.parentElement?.className).toMatch(/flex/);
    expect(screen.getByText(/swap primary anytime — note or dm/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy email/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy linkedin note/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^send$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/auto-?dm/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/response likelihood/i)).not.toBeInTheDocument();
  });

  it("copies note_payload onto the clipboard", async () => {
    render(<ContactNote attendee={marcus} />);
    fireEvent.click(screen.getByRole("button", { name: /^copy note$/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(note_payload(marcus)));
    expect(await screen.findByRole("button", { name: /copied/i })).toBeInTheDocument();
  });

  it("copies dm_payload onto the clipboard", async () => {
    render(<ContactNote attendee={marcus} />);
    fireEvent.click(screen.getByRole("button", { name: /^copy dm$/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(dm_payload(marcus)));
  });

  it("returns to the attendee brief", () => {
    render(<ContactNote attendee={marcus} />);
    expect(screen.getByRole("link", { name: /back to attendees/i })).toHaveAttribute(
      "href",
      "/attendees",
    );
  });
});
