import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Page from "../page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

describe("Home page", () => {
  it("explains what Orbit is, how it works, who it is for, and Try it out", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { name: /meet people around what's happening near you/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /how it works/i })).toBeInTheDocument();
    expect(screen.getByText(/pick a location/i)).toBeInTheDocument();
    expect(screen.getByText(/pick a theme/i)).toBeInTheDocument();
    expect(screen.getByText(/see events/i)).toBeInTheDocument();
    expect(screen.getByText(/create a room/i)).toBeInTheDocument();
    expect(screen.getByText(/see people nearby/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /who it's for/i })).toBeInTheDocument();
    expect(screen.getAllByText(/at an event/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/café/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/hackathon/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /try it out/i }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/google oauth maze/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/research the room/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/time-boxed plan/i)).not.toBeInTheDocument();
  });
});
