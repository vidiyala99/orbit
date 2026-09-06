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
    expect(screen.queryByRole("heading", { name: "Later" })).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid="priority-desk"]')).toHaveLength(1);
    expect(container.querySelectorAll("ul")).toHaveLength(1);
    expect(screen.getByTestId("priority-desk").className).not.toMatch(/grid-cols-3|flex-row|md:grid-cols/);
  });

  it("defaults to Needs you and swaps the single list", () => {
    renderBrief();
    expect(screen.getByRole("tab", { name: "Needs you" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "High" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("Alex Chen")).toBeInTheDocument();
    expect(screen.queryByText("Dev Kim")).not.toBeInTheDocument();
    expect(screen.queryByText("Lina Park")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "High" }));
    expect(screen.getByRole("tab", { name: "High" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Dev Kim")).toBeInTheDocument();
    expect(screen.queryByText("Alex Chen")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Later" }));
    expect(screen.getByText("Lina Park")).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("tab", { name: "High" }));
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
    expect(screen.queryByRole("link", { name: /alex chen on x/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /marcus ellis on x/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /marcus ellis on linkedin/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /maya rao on linkedin/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /maya rao on x/i })).toBeInTheDocument();
    const liCount = screen.getAllByRole("link", { name: /on linkedin/i }).length;
    const xCount = screen.getAllByRole("link", { name: /on x$/i }).length;
    const visible = FIXTURE_ATTENDEES.filter((row) => row.priority === "needs_you").length;
    expect(liCount).toBeLessThan(visible);
    expect(xCount).toBeLessThan(visible);
  });

  it("renders a dense row: avatar, name/role, italic why-meet, rank #N", () => {
    renderBrief();
    expect(screen.getByText("Alex Chen")).toBeInTheDocument();
    expect(screen.getByText("Founder, Render")).toBeInTheDocument();
    const why = screen.getAllByText(/building agent infra/i)[0];
    expect(why.className).toMatch(/font-mono/);
    expect(why.className).toMatch(/italic/);
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.queryByText(/→|←/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /alex chen website/i })).not.toBeInTheDocument();
  });

  it("opens the contact note from the row, without a new nav shell or filter soup", () => {
    renderBrief();
    expect(screen.getByRole("link", { name: "Marcus Ellis" })).toHaveAttribute(
      "href",
      "/attendees/marcus-ellis",
    );
    expect(screen.queryByRole("navigation", { name: /sections|main/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /today|capture|outreach/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/response likelihood/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/invitations/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /unread|warm|cold|all/i })).not.toBeInTheDocument();
  });

  it("kills the equal tall paper-card stack", () => {
    const { container } = renderBrief();
    const row = within(container).getByText("Alex Chen").closest("li");
    expect(row?.className).not.toMatch(/rounded-card/);
    expect(row?.className).not.toMatch(/shadow-card/);
    const rowBody = row?.querySelector(":scope > div.flex");
    expect(rowBody?.className).toMatch(/min-h-14/);
    const list = container.querySelector("ul");
    expect(list?.className).not.toMatch(/gap-4/);
    expect(list?.className).toMatch(/max-h-\[calc\(5\*/);
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
