import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AttendeesPage from "../page";
import ContactNotePage from "../[id]/page";

const notFound = vi.fn(() => {
  throw new Error("NOT_FOUND");
});
vi.mock("next/navigation", () => ({
  notFound: () => notFound(),
}));

beforeEach(() => {
  notFound.mockClear();
});

describe("AttendeesPage", () => {
  it("renders the fixture brief with no session and no sign-in redirect", () => {
    render(<AttendeesPage />);
    expect(screen.getByRole("heading", { name: /nerdconf sf — sat/i })).toBeInTheDocument();
    expect(screen.getByText("Alex Chen")).toBeInTheDocument();
    expect(screen.getByText("Marcus Ellis")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /today|capture|outreach/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/invitations/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
  });
});

describe("ContactNotePage", () => {
  it("renders the Marcus contact note with no session", async () => {
    render(await ContactNotePage({ params: Promise.resolve({ id: "marcus-ellis" }) }));
    expect(screen.getByRole("heading", { name: "Marcus Ellis" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /where you met/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy note/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy dm/i })).toBeInTheDocument();
    expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
  });

  it("404s an unknown attendee", async () => {
    await expect(
      ContactNotePage({ params: Promise.resolve({ id: "missing" }) }),
    ).rejects.toThrow("NOT_FOUND");
  });
});
