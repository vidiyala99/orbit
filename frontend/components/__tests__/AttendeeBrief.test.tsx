import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import AttendeeBrief from "../AttendeeBrief";
import { FIXTURE_ATTENDEES, FIXTURE_EVENT } from "@/lib/demoFixtures";

function renderBrief() {
  return render(<AttendeeBrief event={FIXTURE_EVENT} attendees={FIXTURE_ATTENDEES} />);
}

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

  it("renders a dense row: avatar, name|role, LI/X once, mono italic why-meet, rank #N", () => {
    renderBrief();
    expect(screen.getByText("Alex Chen")).toBeInTheDocument();
    expect(screen.getByText("Founder, Render")).toBeInTheDocument();
    const why = screen.getByText(/building agent infra/i);
    expect(why.className).toMatch(/font-mono/);
    expect(why.className).toMatch(/italic/);
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.queryByText(/→|←/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /alex chen on linkedin/i })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: /alex chen on x/i })).toHaveLength(1);
    expect(screen.queryByRole("link", { name: /alex chen website/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/mail|email/i)).not.toBeInTheDocument();
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
    expect(rowBody?.className).toMatch(/min-h-11/);
    expect(rowBody?.className).toMatch(/md:min-h-10/);
    const list = container.querySelector("ul");
    expect(list?.className).not.toMatch(/gap-4/);
    expect(list?.className).toMatch(/max-h-\[calc\(5\*/);
  });

  it("surfaces the manager helper under the desk", () => {
    renderBrief();
    expect(screen.getByText(/manager surfaces who matters first/i)).toBeInTheDocument();
  });
});
