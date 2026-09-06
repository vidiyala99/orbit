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
    expect(screen.getByText(/sat, 12 guests/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back/i })).toHaveAttribute("href", "/");
  });

  it("stacks Needs you → High → Later as vertical sections, not columns", () => {
    const { container } = renderBrief();
    expect(screen.getByRole("heading", { name: "Needs you" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "High" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Later" })).toBeInTheDocument();
    const stack = screen.getByTestId("priority-stack");
    expect(stack.className).toMatch(/flex-col/);
    expect(stack.className).not.toMatch(/grid-cols-3|flex-row/);
    expect(stack.className).not.toMatch(/md:grid-cols/);
  });

  it("defaults mobile chips to Needs you and swaps one section at a time", () => {
    renderBrief();
    const tabs = screen.getByRole("tablist", { name: /priority/i });
    expect(tabs.className).toMatch(/md:hidden/);
    expect(screen.getByRole("tab", { name: "Needs you" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "High" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("Alex Chen")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "High" }));
    expect(screen.getByRole("tab", { name: "High" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Needs you" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("Dev Kim")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Later" }));
    expect(screen.getByText("Lina Park")).toBeInTheDocument();
  });

  it("renders a dense row: avatar, name|role, LI/X, mono italic why-meet, rank #N", () => {
    renderBrief();
    expect(screen.getByText("Alex Chen")).toBeInTheDocument();
    expect(screen.getByText("Founder, Render")).toBeInTheDocument();
    const why = screen.getByText(/building agent infra/i);
    expect(why.className).toMatch(/font-mono/);
    expect(why.className).toMatch(/italic/);
    expect(screen.getAllByText("#1").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/→|←/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /alex chen on linkedin/i })).toHaveAttribute(
      "href",
      expect.stringContaining("linkedin.com"),
    );
    expect(screen.getByRole("link", { name: /alex chen on x/i })).toHaveAttribute(
      "href",
      expect.stringContaining("x.com"),
    );
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
    const rowBody = row?.querySelector("div.flex");
    expect(rowBody?.className).toMatch(/h-12/);
    expect(rowBody?.className).toMatch(/md:h-14/);
    const list = container.querySelector("ul");
    expect(list?.className).not.toMatch(/gap-4/);
    expect(list?.className).toMatch(/max-h-\[calc\(5\*/);
  });

  it("surfaces the manager helper under the desk", () => {
    renderBrief();
    expect(screen.getByText(/manager surfaces who matters first/i)).toBeInTheDocument();
  });
});
