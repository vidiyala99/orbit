import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import HomePage from "../page";

vi.mock("@/lib/events", () => ({
  loadHomeData: vi.fn().mockResolvedValue({
    upcoming: [], past: [], needsFollowUp: [], lastSyncedAt: null,
    featuredEvent: null, topShortlist: [], shortlistTotal: 0,
    jobTarget: { targetRole: null, targetIndustries: null },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

describe("HomePage", () => {
  it("renders without a signed-in session", async () => {
    render(await HomePage());
    expect(screen.getByText(/good to see you/i)).toBeInTheDocument();
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
  });
});
