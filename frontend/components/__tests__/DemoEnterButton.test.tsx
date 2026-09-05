import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import DemoEnterButton from "../DemoEnterButton";
import * as api from "@/lib/api";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const onboarded = {
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
};

describe("DemoEnterButton", () => {
  beforeEach(() => {
    push.mockReset();
    document.cookie = "sc_token=; path=/; max-age=0";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is shown by default and lands on the location step", async () => {
    vi.spyOn(api, "demoLogin").mockResolvedValue({ access_token: "demotok", user: onboarded });
    render(<DemoEnterButton />);
    fireEvent.click(screen.getByRole("button", { name: /try it out/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/try"));
    expect(document.cookie).toContain("sc_token=demotok");
  });

  it("hides when the flag is explicitly false", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_LOGIN_ENABLED", "false");
    render(<DemoEnterButton />);
    expect(screen.queryByRole("button", { name: /try it out/i })).not.toBeInTheDocument();
  });
});
