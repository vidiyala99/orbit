import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Page from "../page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

describe("Home page", () => {
  it("is a map-first cork hero with one line, pins, and one Try it out", () => {
    const { container } = render(<Page />);
    expect(container.querySelector("main")?.className).not.toMatch(/items-center justify-center/);
    expect(screen.getByRole("heading", { name: /meet the people already at your café or hackathon/i })).toBeInTheDocument();
    expect(screen.getByText(/pick a place and a theme\. see who's nearby — then walk over/i)).toBeInTheDocument();
    expect(screen.getByTestId("landing-preview")).toBeInTheDocument();
    expect(screen.getAllByTestId("preview-pin")).toHaveLength(4);
    expect(screen.getAllByRole("button", { name: /try it out/i })).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: /how it works/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /who it's for/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/create a room/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/google oauth maze/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/research the room/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/time-boxed plan/i)).not.toBeInTheDocument();
  });
});
