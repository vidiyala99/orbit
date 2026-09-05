import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Page from "../page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

describe("Home page", () => {
  it("has a hero, who it's for, three map steps, a filled preview, and one Try it out", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { name: /see who's nearby/i })).toBeInTheDocument();
    expect(screen.getByText(/meet them in person/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /who it's for/i })).toBeInTheDocument();
    expect(screen.getByText(/at a café or cowork/i)).toBeInTheDocument();
    expect(screen.getByText(/at a hackathon or meetup/i)).toBeInTheDocument();
    expect(screen.getByText(/new in town/i)).toBeInTheDocument();
    expect(screen.getByTestId("landing-preview")).toBeInTheDocument();
    expect(screen.getAllByText(/priya r\./i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/hack table/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /how it works/i })).toBeInTheDocument();
    expect(screen.getByText(/pick a location/i)).toBeInTheDocument();
    expect(screen.getByText(/pick a theme/i)).toBeInTheDocument();
    expect(screen.getByText(/meet on the map/i)).toBeInTheDocument();
    expect(screen.queryByText(/create a room/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /try it out/i })).toHaveLength(1);
    expect(screen.queryByText(/google oauth maze/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/research the room/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/time-boxed plan/i)).not.toBeInTheDocument();
  });
});
