import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Page from "../page";
import * as api from "@/lib/api";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => "/",
}));

describe("Home page", () => {
  beforeEach(() => {
    push.mockReset();
    document.cookie = "sc_token=; path=/; max-age=0";
  });

  it("is a cork hero with one sage Try it out into Slice A", () => {
    const { container } = render(<Page />);
    expect(container.querySelector("main")?.className).not.toMatch(/items-center justify-center/);
    expect(screen.getByRole("heading", { name: /meet the people already at your café or hackathon/i })).toBeInTheDocument();
    expect(screen.getByText(/pick a place and a theme\. see who's nearby — then walk over/i)).toBeInTheDocument();
    expect(screen.getByTestId("landing-preview")).toBeInTheDocument();
    expect(screen.getAllByTestId("preview-pin")).toHaveLength(4);
    const tryIt = screen.getAllByRole("button", { name: /try it out/i });
    expect(tryIt).toHaveLength(1);
    expect(tryIt[0].className).toMatch(/bg-accent/);
    expect(screen.queryByRole("heading", { name: /how it works/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /who it's for/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/create a room/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/google oauth maze/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/research the room/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/time-boxed plan/i)).not.toBeInTheDocument();
  });

  it("sends Try it out to /attendees, not the old map funnel", async () => {
    vi.spyOn(api, "demoLogin").mockResolvedValue({
      access_token: "demotok",
      user: {
        id: "u1",
        email: "demo@orbit.app",
        email_verified_at: "2026-01-01T00:00:00Z",
        headline: null,
        linkedin_url: null,
        avatar_url: null,
        first_name: "Demo",
        last_name: "User",
        city: "Mountain View, CA",
        lat: 37.38,
        lon: -122.08,
        pain_points: null,
        pain_point_other: null,
        onboarded_at: "2026-01-01T00:00:00Z",
        google_calendar_connected: false,
      },
    });

    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: /try it out/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/attendees"));
    expect(push).not.toHaveBeenCalledWith("/try");
    expect(push).not.toHaveBeenCalledWith("/map");
  });
});
