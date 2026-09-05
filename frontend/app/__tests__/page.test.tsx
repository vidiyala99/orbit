import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Page from "../page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

describe("Home page", () => {
  it("is Orbit, one line, and Try it out — no headline stack", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { name: /^orbit$/i })).toBeInTheDocument();
    expect(screen.getByText(/meet people around what you're into/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try it out/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /bring people together/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/four taps/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/networking used to run on luck/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /how it works/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/map what's live around you/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/google oauth maze/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/research the room/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/time-boxed plan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/one tap into the demo/i)).not.toBeInTheDocument();
  });
});
