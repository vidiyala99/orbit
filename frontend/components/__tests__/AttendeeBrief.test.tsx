import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AttendeeBrief from "../AttendeeBrief";
import { FIXTURE_ATTENDEES, FIXTURE_EVENT } from "@/lib/demoFixtures";
import { dm_payload, note_payload } from "@/lib/contactCopy";

const writeText = vi.fn().mockResolvedValue(undefined);

function renderBrief() {
  return render(<AttendeeBrief event={FIXTURE_EVENT} attendees={FIXTURE_ATTENDEES} />);
}

beforeEach(() => {
  writeText.mockClear();
  Object.assign(navigator, { clipboard: { writeText } });
});

describe("AttendeeBrief", () => {
  it("renders the event header and guest count without a serif display face", () => {
    renderBrief();
    const title = screen.getByRole("heading", { name: /nerdconf sf/i });
    expect(title).toBeInTheDocument();
    expect(title.className).not.toMatch(/serif/);
    expect(screen.getByText(/sat · 12 guests/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back/i })).toHaveAttribute("href", "/");
  });

  it("shows one segmented list at a time, not stacked tables or columns", () => {
    const { container } = renderBrief();
    expect(screen.getByRole("tablist", { name: /priority/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Needs you" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "High" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "All guests" })).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid="priority-desk"]')).toHaveLength(1);
    expect(container.querySelectorAll("ul")).toHaveLength(1);
    expect(screen.getByTestId("priority-desk").className).not.toMatch(/grid-cols-3|flex-row|md:grid-cols/);
  });

  it("defaults to Needs you and swaps the single list", () => {
    renderBrief();
    expect(screen.getByRole("tab", { name: /^Needs you/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /^High/ })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("Alex Chen")).toBeInTheDocument();
    expect(screen.queryByText("Dev Kim")).not.toBeInTheDocument();
    expect(screen.queryByText("Riley Cole")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /^High/ }));
    expect(screen.getByRole("tab", { name: /^High/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Dev Kim")).toBeInTheDocument();
    expect(screen.getByText("Sam Ortiz")).toBeInTheDocument();
    expect(screen.queryByText("Alex Chen")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /^All guests/ }));
    expect(screen.getByText("Riley Cole")).toBeInTheDocument();
    expect(screen.queryByText("Dev Kim")).not.toBeInTheDocument();
  });

  it("shows a live count on every segment tab, computed from all attendees", () => {
    renderBrief();
    const needsYouCount = FIXTURE_ATTENDEES.filter((row) => row.priority === "needs_you").length;
    const highCount = FIXTURE_ATTENDEES.filter((row) => row.priority === "high").length;
    const laterCount = FIXTURE_ATTENDEES.filter((row) => row.priority === "later").length;
    expect(screen.getByRole("tab", { name: `Needs you ${needsYouCount}` })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: `High ${highCount}` })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: `All guests ${laterCount}` })).toBeInTheDocument();

    // Counts stay put after switching segments — they reflect the full
    // attendee list, not the currently-filtered rows.
    fireEvent.click(screen.getByRole("tab", { name: `High ${highCount}` }));
    expect(screen.getByRole("tab", { name: `Needs you ${needsYouCount}` })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: `All guests ${laterCount}` })).toBeInTheDocument();
  });

  it("renders the search input in every segment, not gated behind pre-event", () => {
    renderBrief();
    // FIXTURE_EVENT has starts_at: null, i.e. post-event — the search bar
    // used to be hidden entirely in this state.
    const search = screen.getByRole("textbox", { name: /search guests/i });
    expect(search).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /^High/ }));
    fireEvent.change(search, { target: { value: "sam" } });
    expect(screen.getByText("Sam Ortiz")).toBeInTheDocument();
    expect(screen.queryByText("Dev Kim")).not.toBeInTheDocument();
  });

  it("puts Copy note and Copy DM on every Needs you row, not High/Later", () => {
    renderBrief();
    const needsYou = FIXTURE_ATTENDEES.filter((row) => row.priority === "needs_you");
    expect(screen.getAllByRole("button", { name: /^copy note$/i })).toHaveLength(needsYou.length);
    expect(screen.getAllByRole("button", { name: /^copy dm$/i })).toHaveLength(needsYou.length);
    for (const row of needsYou) {
      const item = screen.getByText(`${row.first_name} ${row.last_name}`).closest("li");
      expect(item).toBeTruthy();
      expect(within(item!).getByRole("button", { name: /^copy note$/i })).toBeInTheDocument();
      expect(within(item!).getByRole("button", { name: /^copy dm$/i })).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole("tab", { name: /^High/ }));
    expect(screen.queryByRole("button", { name: /^copy note$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^copy dm$/i })).not.toBeInTheDocument();
  });

  it("copies note_payload and dm_payload from a Needs you row", async () => {
    renderBrief();
    const alex = FIXTURE_ATTENDEES.find((row) => row.id === "alex-chen")!;
    const row = screen.getByText("Alex Chen").closest("li")!;
    fireEvent.click(within(row).getByRole("button", { name: /^copy note$/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(note_payload(alex)));
    fireEvent.click(within(row).getByRole("button", { name: /^copy dm$/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(dm_payload(alex)));
  });

  it("shows contextual LI/X only, not both on every row", () => {
    renderBrief();
    expect(screen.getByRole("link", { name: /alex chen on linkedin/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /alex chen on x/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /marcus ellis on x/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /marcus ellis on linkedin/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /priya raman on linkedin/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /priya raman on x/i })).not.toBeInTheDocument();
    const liCount = screen.getAllByRole("link", { name: /on linkedin/i }).length;
    const xCount = screen.getAllByRole("link", { name: /on x$/i }).length;
    const visible = FIXTURE_ATTENDEES.filter((row) => row.priority === "needs_you").length;
    expect(liCount).toBeLessThan(visible);
    expect(xCount).toBeLessThan(visible);

    fireEvent.click(screen.getByRole("tab", { name: /^High/ }));
    expect(screen.getByRole("link", { name: /sam ortiz on x/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sam ortiz on linkedin/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /^All guests/ }));
    expect(screen.getByRole("link", { name: /riley cole on linkedin/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /riley cole on x/i })).not.toBeInTheDocument();
  });

  it("renders a card row: avatar, name/role, why-meet once, rank #N", () => {
    renderBrief();
    expect(screen.getByText("Alex Chen")).toBeInTheDocument();
    expect(screen.getByText("Founder, Render")).toBeInTheDocument();
    // Alex Chen has a genuine relevance signal, so why_meet renders exactly
    // once, as the accent bubble — not duplicated as a plain italic caption.
    expect(screen.getAllByText(/building agent infra/i)).toHaveLength(1);
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.queryByText(/→|←/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /alex chen website/i })).not.toBeInTheDocument();
  });

  it("shows a relevance bubble only when why_meet carries a real signal, never duplicated", () => {
    const attendees = FIXTURE_ATTENDEES.map((row) =>
      row.id === "marcus-ellis"
        ? { ...row, why_meet: "No evidence found that Marcus Ellis is relevant to your target role." }
        : row,
    );
    render(<AttendeeBrief event={FIXTURE_EVENT} attendees={attendees} />);

    // Alex Chen has a genuine signal — the bubble renders with a dot marker,
    // and it is the only rendering of that text (no plain-caption duplicate).
    const alexRow = screen.getByText("Alex Chen").closest("li")!;
    const alexBubble = within(alexRow).getByText(/building agent infra/i, { selector: "span" });
    expect(alexBubble.parentElement?.className).toMatch(/bg-accent-soft/);
    expect(within(alexRow).queryAllByText(/building agent infra/i)).toHaveLength(1);

    // Marcus Ellis's why_meet is a negative result — no accent pill for it;
    // it falls back to the plain italic caption instead, rendered once.
    const marcusRow = screen.getByText("Marcus Ellis").closest("li")!;
    expect(within(marcusRow).queryByText(/no evidence found/i, { selector: "span" })).not.toBeInTheDocument();
    const marcusCaption = within(marcusRow).getByText(/no evidence found/i, { selector: "p" });
    expect(marcusCaption.className).toMatch(/italic/);
    expect(within(marcusRow).queryAllByText(/no evidence found/i)).toHaveLength(1);
  });

  it("opens the contact note from the row, without a new nav shell or filter soup", () => {
    renderBrief();
    expect(screen.getByRole("link", { name: "Marcus Ellis" })).toHaveAttribute(
      "href",
      "/people/marcus-ellis",
    );
    expect(screen.queryByRole("navigation", { name: /sections|main/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /today|capture|outreach/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/response likelihood/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/invitations/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /unread|warm|cold/i })).not.toBeInTheDocument();
  });

  it("uses compact guest rows, not oversized photo cards", () => {
    const { container } = renderBrief();
    const row = within(container).getByText("Alex Chen").closest("li");
    const rowBody = row?.querySelector(":scope > div");
    expect(rowBody?.className).toMatch(/rounded-lg/);
    expect(rowBody?.querySelector(":scope > div")?.className).toMatch(/\bflex\b/);
    const list = container.querySelector("ul");
    expect(list?.className).toMatch(/gap-1\.5/);
    // No real photo → initials, not a random stock headshot.
    expect(row?.querySelector("img")).toBeNull();
    expect(within(row as HTMLElement).getByText("AC")).toBeInTheDocument();
  });

  it("has no serif footer and uses a LinkedIn mark, not a heart", () => {
    const { container } = renderBrief();
    expect(screen.queryByText(/manager surfaces who matters first/i)).not.toBeInTheDocument();
    expect(container.querySelector("footer")).toBeNull();
    const li = screen.getByRole("link", { name: /alex chen on linkedin/i });
    expect(li.querySelector("rect")).toBeTruthy();
    expect(li.getAttribute("aria-label")).toMatch(/linkedin/i);
    expect(container.innerHTML).not.toMatch(/heart|♥|♡/i);
  });
});
