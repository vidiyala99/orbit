import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Inbox from "../Inbox";
import type { InboxPersonT } from "@/lib/events";

const person: InboxPersonT = {
  id: "kept-1",
  first_name: "Abhinav",
  last_name: "Anand",
  role: "Founder & AI Product Engineer",
  why: "Building in your space",
  avatar_url: null,
  event_title: "build fridays sf x sentry",
  triaged_at: "2026-09-11T00:00:00Z",
  email: "abhinav.anand@orbit.demo",
  email_body: "Hi Abhinav,\n\nGreat meeting you at build fridays sf x sentry.",
  dm_body: "Hey Abhinav — enjoyed meeting you at build fridays sf x sentry.",
};

describe("Inbox", () => {
  it("shows a scannable kept list that opens person detail", () => {
    render(<Inbox people={[person]} />);
    expect(screen.getByRole("heading", { name: /^inbox$/i })).toBeInTheDocument();
    expect(screen.queryByText(/sample email/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sample dm/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /abhinav anand/i })).toHaveAttribute(
      "href",
      "/people/kept-1",
    );
    expect(screen.getByText(/founder & ai product engineer/i)).toBeInTheDocument();
  });

  it("empty state links back to Home", () => {
    render(<Inbox people={[]} />);
    expect(screen.getByText(/empty for now/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /← home/i })).toHaveAttribute("href", "/home");
  });

  it("shows why keep when present", () => {
    render(<Inbox people={[person]} />);
    expect(screen.getByText(/^why keep$/i)).toBeInTheDocument();
    expect(screen.getByText(/building in your space/i)).toBeInTheDocument();
  });
});
