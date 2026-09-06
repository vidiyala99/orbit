import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ContactNote from "../ContactNote";
import { emailText, linkedInNoteText } from "@/lib/contactCopy";
import { fixtureAttendee } from "@/lib/demoFixtures";

const marcus = fixtureAttendee("marcus-ellis")!;
const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  writeText.mockClear();
  Object.assign(navigator, { clipboard: { writeText } });
});

describe("ContactNote", () => {
  it("stacks where / talked / why and only the two copy actions", () => {
    render(<ContactNote attendee={marcus} />);
    expect(screen.getByRole("heading", { name: "Marcus Ellis" })).toBeInTheDocument();
    expect(screen.getByText("Founding Engineer at Render")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
      "href",
      marcus.linkedin_url,
    );
    expect(screen.getByRole("link", { name: "X" })).toHaveAttribute("href", marcus.x_url);
    expect(screen.getByRole("heading", { name: /where you met/i })).toBeInTheDocument();
    expect(screen.getByText(/burning token hackathon · austin/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /what you talked about/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /why it matters/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy linkedin note/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy email/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/auto-?dm/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/response likelihood/i)).not.toBeInTheDocument();
  });

  it("copies the LinkedIn note onto the clipboard", async () => {
    render(<ContactNote attendee={marcus} />);
    fireEvent.click(screen.getByRole("button", { name: /copy linkedin note/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(linkedInNoteText(marcus)));
    expect(await screen.findByRole("button", { name: /copied/i })).toBeInTheDocument();
  });

  it("copies the email onto the clipboard", async () => {
    render(<ContactNote attendee={marcus} />);
    fireEvent.click(screen.getByRole("button", { name: /copy email/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(emailText(marcus)));
  });

  it("returns to the attendee brief", () => {
    render(<ContactNote attendee={marcus} />);
    expect(screen.getByRole("link", { name: /back to attendees/i })).toHaveAttribute(
      "href",
      "/attendees",
    );
  });
});
