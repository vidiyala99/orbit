import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AttendeesPage from "../page";
import ContactNotePage from "../[id]/page";

const cookieValue = vi.fn<() => string | undefined>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "sc_token" ? { value: cookieValue() } : undefined),
  }),
}));

const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
const notFound = vi.fn(() => {
  throw new Error("NOT_FOUND");
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
  notFound: () => notFound(),
}));

beforeEach(() => {
  cookieValue.mockReset();
  redirect.mockClear();
  notFound.mockClear();
  cookieValue.mockReturnValue("tok");
});

describe("AttendeesPage", () => {
  it("redirects anonymous visitors to sign in", async () => {
    cookieValue.mockReturnValue(undefined);
    await expect(AttendeesPage()).rejects.toThrow("REDIRECT:/sign-in");
  });

  it("renders the fixture brief without Today/Capture/Outreach chrome", async () => {
    render(await AttendeesPage());
    expect(screen.getByRole("heading", { name: /nerdconf sf — sat/i })).toBeInTheDocument();
    expect(screen.getByText("Alex Chen")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /today|capture|outreach/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/invitations/i)).not.toBeInTheDocument();
  });
});

describe("ContactNotePage", () => {
  it("redirects anonymous visitors to sign in", async () => {
    cookieValue.mockReturnValue(undefined);
    await expect(
      ContactNotePage({ params: Promise.resolve({ id: "marcus-ellis" }) }),
    ).rejects.toThrow("REDIRECT:/sign-in");
  });

  it("renders the Marcus contact note from fixtures", async () => {
    render(await ContactNotePage({ params: Promise.resolve({ id: "marcus-ellis" }) }));
    expect(screen.getByRole("heading", { name: "Marcus Ellis" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /where you met/i })).toBeInTheDocument();
  });

  it("404s an unknown attendee", async () => {
    await expect(
      ContactNotePage({ params: Promise.resolve({ id: "missing" }) }),
    ).rejects.toThrow("NOT_FOUND");
  });
});
