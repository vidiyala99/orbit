import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Page from "../page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

/** Phrases that only make sense for the pre-Actintro product (follow-up desk,
 *  calendar/Gmail sourcing). Waitlist is intentional on the marketing page. */
const OLD_PRODUCT_COPY = [
  /needs you/i,
  /copy note/i,
  /copy dm/i,
  /google calendar/i,
  /gmail/i,
  /meetup/i,
  /eventbrite/i,
  /communications manager/i,
];

describe("Landing page", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      }),
    );
  });

  it("leads with the Luma-to-ranked-attendees promise and a waitlist CTA", () => {
    render(<Page />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/who to meet/i);
    expect(screen.getAllByRole("button", { name: /join waitlist/i }).length).toBeGreaterThan(0);
    const demoLinks = screen.getAllByRole("link", { name: /try the demo/i });
    expect(demoLinks.length).toBeGreaterThan(0);
    demoLinks.forEach((link) => expect(link).toHaveAttribute("href", "/home"));
  });

  it("submits the waitlist form to /api/waitlist", async () => {
    render(<Page />);
    const email = screen.getAllByLabelText(/^email$/i)[0];
    fireEvent.change(email, { target: { value: "founder@example.com" } });
    fireEvent.click(screen.getAllByRole("button", { name: /join waitlist/i })[0]);
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/waitlist",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "founder@example.com" }),
        }),
      ),
    );
    expect(await screen.findByText(/you're on the list/i)).toBeInTheDocument();
  });

  it("previews the Home Focus stage, not a fake ranked list", () => {
    render(<Page />);

    const preview = screen.getAllByTestId("focus-preview")[0];
    expect(within(preview).getByText("Top match")).toBeInTheDocument();
    expect(within(preview).getAllByText("Alex Chen").length).toBeGreaterThan(0);
    expect(within(preview).getByRole("button", { name: /^Keep$/i })).toBeInTheDocument();
    expect(within(preview).getByRole("button", { name: /^Skip$/i })).toBeInTheDocument();
    expect(within(preview).getByText(/how to approach/i)).toBeInTheDocument();
  });

  it("lets you advance through marketing Focus profiles", () => {
    render(<Page />);
    const preview = screen.getAllByTestId("focus-preview")[0];
    fireEvent.click(within(preview).getAllByRole("button", { name: /Next person/i })[0]);
    expect(within(preview).getAllByText("Marcus Ellis").length).toBeGreaterThan(0);
    fireEvent.click(within(preview).getByRole("button", { name: /Show Priya Raman/i }));
    expect(within(preview).getAllByText("Priya Raman").length).toBeGreaterThan(0);
    fireEvent.click(within(preview).getByRole("button", { name: /Show Jordan Miles/i }));
    expect(within(preview).getAllByText("Jordan Miles").length).toBeGreaterThan(0);
    fireEvent.click(within(preview).getByRole("button", { name: /Show Sam Okonkwo/i }));
    expect(within(preview).getAllByText("Sam Okonkwo").length).toBeGreaterThan(0);
  });

  it("explains the loop in the product's own words: guest list, Focus, Inbox", () => {
    render(<Page />);

    expect(screen.getByRole("heading", { name: /pull the guest list/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /set focus/i })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: /keep or skip/i }).length).toBeGreaterThan(0);
    expect(screen.getByText(/keep files the person/i)).toBeInTheDocument();
    expect(screen.getByText(/starts with luma/i)).toBeInTheDocument();
  });

  it("carries no copy from the pre-Actintro product", () => {
    const { container } = render(<Page />);
    const text = container.textContent ?? "";

    OLD_PRODUCT_COPY.forEach((phrase) => expect(text).not.toMatch(phrase));
  });

  it("ships multiple marketing sections beyond a single hero", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { name: /guest list in\. focus on/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /the room, ordered for you/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /get in before the next lobby/i })).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});
