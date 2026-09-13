import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import HomePage from "../page";

vi.mock("@/lib/events", () => ({
  loadHomeData: vi.fn().mockResolvedValue({
    upcoming: [],
    past: [],
    events: [],
    reviewQueue: [],
    catchUp: [],
    inboxCount: 0,
    lastSyncedAt: null,
    featuredEvent: null,
    jobTarget: { targetRole: null, targetIndustries: null },
    focus: { role: null, struggle: null },
    lumaConnected: false,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

describe("HomePage", () => {
  it("renders without a signed-in session", async () => {
    render(await HomePage());
    expect(screen.getByText(/good to see you/i)).toBeInTheDocument();
    expect(screen.getByText(/no upcoming event yet/i)).toBeInTheDocument();
  });
});
