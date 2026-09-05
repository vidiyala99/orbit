import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Page from "../page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

describe("Home page", () => {
  it("has a clear hero, one audience line, three steps, a map preview, and one Try it out", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { name: /meet the people already at your café, hackathon, or event/i })).toBeInTheDocument();
    expect(screen.getByText(/for people at cafés, hackathons, and events who want a real meetup/i)).toBeInTheDocument();
    expect(screen.getByTestId("landing-preview")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /how it works/i })).toBeInTheDocument();
    expect(screen.getByText(/pick a location/i)).toBeInTheDocument();
    expect(screen.getByText(/pick a theme/i)).toBeInTheDocument();
    expect(screen.getByText(/see the map/i)).toBeInTheDocument();
    expect(screen.queryByText(/create a room/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /try it out/i })).toHaveLength(1);
    expect(screen.queryByText(/google oauth maze/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/research the room/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/time-boxed plan/i)).not.toBeInTheDocument();
  });
});
