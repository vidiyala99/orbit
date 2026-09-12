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
    expect(screen.getAllByRole("link", { name: /marcus ellis on linkedin/i })[0]).toHaveAttribute(
      "href",
      marcus.linkedin_url,
    );
    expect(screen.getAllByRole("link", { name: /marcus ellis on x/i })[0]).toHaveAttribute(
      "href",
      marcus.x_url,
    );
    expect(screen.queryByText(/^LI$/)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /where you met/i })).toBeInTheDocument();
    expect(screen.getByText(/founders cowork wednesdays · austin/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /what you talked about/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /why it matters/i })).toBeInTheDocument();
    const why = screen.getByText(/same problem space/i);
    expect(why.className).toMatch(/italic/);
    const note = screen.getByRole("button", { name: /^copy note$/i });
    const dm = screen.getByRole("button", { name: /^copy dm$/i });
    expect(note.className).toMatch(/bg-accent/);
    expect(dm.className).toMatch(/border-ink/);
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

  it("returns to the Inbox by default", () => {
    render(<ContactNote attendee={marcus} />);
    expect(screen.getByRole("link", { name: /back to inbox/i })).toHaveAttribute(
      "href",
      "/inbox",
    );
  });

  it("returns to Home when opened from Focus", () => {
    render(
      <ContactNote attendee={marcus} backHref="/home" backLabel="Back to Home" />,
    );
    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute(
      "href",
      "/home",
    );
  });

  it("renders pre-event fields when the event hasn't started yet", () => {
    const preEventAttendee = {
      ...marcus,
      talking_points: ["Ask about their Series A timeline."],
    };
    render(<ContactNote attendee={preEventAttendee} preEvent />);
    expect(screen.getByRole("heading", { name: /what they build/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /talk to them about/i })).toBeInTheDocument();
    expect(screen.getByText(/ask about their series a timeline/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /where you met/i })).not.toBeInTheDocument();
  });

  it("hides the talking-points section when there are none", () => {
    render(<ContactNote attendee={{ ...marcus, talking_points: null }} preEvent />);
    expect(screen.queryByRole("heading", { name: /talk to them about/i })).not.toBeInTheDocument();
  });

  it("hides empty post-event note fields", () => {
    render(
      <ContactNote
        attendee={{
          ...marcus,
          note: { where_met: "", what_talked: "", why: "" },
        }}
      />,
    );
    expect(screen.queryByRole("heading", { name: /where you met/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /what you talked about/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /why it matters/i })).not.toBeInTheDocument();
    expect(screen.getByText(/no notes yet/i)).toBeInTheDocument();
  });

  it("puts LinkedIn/X in the act footer on the page sheet (desktop placement)", () => {
    render(<ContactNote attendee={marcus} />);
    const linkedin = screen.getAllByRole("link", { name: /marcus ellis on linkedin/i });
    const actions = screen.getByRole("button", { name: /^copy note$/i }).closest("div")
      ?.parentElement;
    expect(actions).toBeTruthy();
    // One mobile (identity) + one desktop (footer); footer copy shares the actions parent.
    expect(linkedin.length).toBe(2);
    expect(actions!.querySelector('a[aria-label="Marcus Ellis on LinkedIn"]')).toBeTruthy();
  });
});
