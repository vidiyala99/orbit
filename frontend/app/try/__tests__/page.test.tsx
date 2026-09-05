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

const person = {
  user_id: "u3",
  first_name: "Priya",
  last_name: "Raman",
  headline: "Working in a cafe",
  intent_tags: ["co_founder"],
  match_score: 0.8,
};

describe("Try page", () => {
  beforeEach(() => {
    document.cookie = "sc_token=; path=/; max-age=0";
    sessionStorage.clear();
    vi.spyOn(api, "demoLogin").mockResolvedValue({ access_token: "demotok", user });
    vi.spyOn(api, "fetchNearbyPlans").mockResolvedValue([plan]);
    vi.spyOn(api, "fetchNearbyRooms").mockResolvedValue([room]);
    vi.spyOn(api, "fetchPeopleAround").mockResolvedValue([
      {
        user_id: person.user_id,
        first_name: person.first_name,
        last_name: person.last_name,
        status: "Working in a cafe",
        lat: 37.3861,
        lon: -122.0839,
      },
    ]);
  });

  it("demo-logs in, then location → theme → events, people, create room", async () => {
    render(<TryPage />);

    expect(await screen.findByRole("heading", { name: /pick a location/i })).toBeInTheDocument();
    expect(api.demoLogin).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /mountain view, ca/i }));

    expect(await screen.findByRole("heading", { name: /pick a theme/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^tech$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^design$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^food$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^music$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sports$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^outdoors$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^tech$/i }));

    expect(await screen.findByRole("heading", { name: /tech in mountain view/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /nearby events/i })).toBeInTheDocument();
    expect(screen.getByText(/ai \/ startup hack table/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /people nearby/i })).toBeInTheDocument();
    expect(screen.getByText(/priya raman/i)).toBeInTheDocument();
    expect(screen.getByText(/working in a cafe/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^rooms$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/create a room/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(api.fetchNearbyPlans).toHaveBeenCalled();
      expect(api.fetchPeopleAround).toHaveBeenCalled();
    });
  });
});
