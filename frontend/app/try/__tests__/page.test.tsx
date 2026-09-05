import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TryPage from "../page";
import * as api from "@/lib/api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/try",
}));

const user = {
  id: "u1",
  email: "demo@orbit.app",
  email_verified_at: "2026-01-01T00:00:00Z",
  headline: "Just exploring",
  linkedin_url: null,
  avatar_url: null,
  first_name: "Demo",
  last_name: "Guest",
  city: "Mountain View, CA",
  lat: 37.3861,
  lon: -122.0839,
  pain_points: null,
  pain_point_other: null,
  onboarded_at: "2026-01-01T00:00:00Z",
  google_calendar_connected: false,
};

const plan = {
  id: "p1",
  user_id: "u2",
  activity: "event",
  openness: "open_to_chat",
  detail: "AI / startup hack table",
  text: "At an event, open to chat — AI / startup hack table",
  lat: 37.3861,
  lon: -122.0839,
  starts_at: new Date(Date.now() - 60000).toISOString(),
  ends_at: new Date(Date.now() + 45 * 60000).toISOString(),
};

const room = {
  id: "r1",
  creator_id: "u1",
  name: "Founders Cowork Wednesdays",
  purpose: "cowork" as const,
  visibility: "public" as const,
  lat: 37.3861,
  lon: -122.0839,
  created_at: "2026-08-20T10:00:00Z",
  member_count: 3,
  is_member: true,
};

describe("Try page", () => {
  beforeEach(() => {
    document.cookie = "sc_token=; path=/; max-age=0";
    sessionStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
    vi.spyOn(api, "demoLogin").mockResolvedValue({ access_token: "demotok", user });
    vi.spyOn(api, "fetchNearbyPlans").mockResolvedValue([plan]);
    vi.spyOn(api, "fetchNearbyRooms").mockResolvedValue([room]);
    vi.spyOn(api, "fetchPeopleAround").mockResolvedValue([
      {
        user_id: "u3",
        first_name: "Priya",
        last_name: "Raman",
        status: "Working in a cafe",
        lat: 37.3861,
        lon: -122.0839,
      },
    ]);
  });

  it("demo-logs in, then location → theme → interactive map", async () => {
    render(<TryPage />);

    expect(await screen.findByRole("heading", { name: /pick a location/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /mountain view, ca/i }));
    expect(await screen.findByRole("heading", { name: /pick a theme/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^tech$/i }));

    expect(await screen.findByRole("heading", { name: /tech in mountain view/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^map$/i })).toBeInTheDocument();
    expect(screen.getByTestId("map-split")).toBeInTheDocument();
    expect(screen.getByTestId("pin-you")).toBeInTheDocument();
    expect(await screen.findByTestId("pin-person-u3")).toBeInTheDocument();
    expect(screen.getByTestId("pin-event-p1")).toBeInTheDocument();
    expect(screen.getByText(/priya raman/i)).toBeInTheDocument();
    expect(screen.getByText(/working in a cafe/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create room/i })).toBeInTheDocument();
    expect(screen.queryByTestId("nearby-list")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /nearby events/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/at an event, open to chat/i)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(api.fetchNearbyPlans).toHaveBeenCalled();
      expect(api.fetchPeopleAround).toHaveBeenCalled();
    });
  });

  it("fills the map from fixtures when the API fails", async () => {
    vi.spyOn(api, "demoLogin").mockRejectedValue(new Error("API down"));
    vi.spyOn(api, "fetchNearbyPlans").mockRejectedValue(new Error("API down"));
    vi.spyOn(api, "fetchNearbyRooms").mockRejectedValue(new Error("API down"));
    vi.spyOn(api, "fetchPeopleAround").mockRejectedValue(new Error("API down"));

    render(<TryPage />);
    fireEvent.click(await screen.findByRole("button", { name: /mountain view, ca/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^tech$/i }));

    expect(await screen.findByTestId("map-split")).toBeInTheDocument();
    expect(screen.getByText(/priya raman/i)).toBeInTheDocument();
    expect(screen.getByText(/working in a café/i)).toBeInTheDocument();
    expect(screen.getByText(/at a hackathon/i)).toBeInTheDocument();
    expect(screen.getByText(/just exploring/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create room/i })).toBeInTheDocument();
  });
});
