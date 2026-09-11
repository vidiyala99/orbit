import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Page from "../page";
import { FIXTURE_ATTENDEES, attendeeName } from "@/lib/demoFixtures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

/** Phrases that only make sense for the pre-Orbit product (follow-up desk,
 *  calendar/Gmail sourcing, waitlist). None may reappear on the landing page. */
const OLD_PRODUCT_COPY = [
  /needs you/i,
  /copy note/i,
  /copy dm/i,
  /google calendar/i,
  /gmail/i,
  /meetup/i,
  /eventbrite/i,
  /waitlist/i,
  /communications manager/i,
];

describe("Landing page", () => {
  it("leads with the Luma-to-ranked-attendees promise and a demo entry", () => {
    render(<Page />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/who to meet/i);
    const demoLinks = screen.getAllByRole("link", { name: /try the demo/i });
    expect(demoLinks.length).toBeGreaterThan(0);
    demoLinks.forEach((link) => expect(link).toHaveAttribute("href", "/home"));
  });

  it("previews real fixture attendees ranked against a Focus", () => {
    render(<Page />);

    const preview = screen.getByTestId("ranked-preview");
    expect(within(preview).getByText("Your Focus")).toBeInTheDocument();
    FIXTURE_ATTENDEES.slice(0, 3).forEach((row) => {
      expect(within(preview).getByText(attendeeName(row))).toBeInTheDocument();
    });
  });

  it("explains the loop in the product's own words: Luma, Focus, Inbox", () => {
    render(<Page />);

    expect(screen.getByRole("heading", { name: /pulled from your luma/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /ranked against your focus/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /keep or skip/i })).toBeInTheDocument();
    expect(screen.getByText(/keep sends them to your inbox/i)).toBeInTheDocument();
  });

  it("carries no copy from the pre-Orbit product", () => {
    const { container } = render(<Page />);
    const text = container.textContent ?? "";

    OLD_PRODUCT_COPY.forEach((phrase) => expect(text).not.toMatch(phrase));
  });
});
