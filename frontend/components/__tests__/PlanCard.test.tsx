import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PlanCard from "../PlanCard";

const plan = {
  id: "1", user_id: "u1", text: "Coffee near University Ave",
  activity: "coffee", openness: "open_to_chat", detail: null,
  lat: 37.44, lon: -122.14,
  starts_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  ends_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
};

describe("PlanCard", () => {
  it("shows the plan text and a LIVE badge when within the time window", () => {
    render(<PlanCard plan={plan} rotationSeed={0} />);
    expect(screen.getByText("Coffee near University Ave")).toBeInTheDocument();
    expect(screen.getByText("LIVE")).toBeInTheDocument();
  });

  it("shows ENDED when the plan's window has passed", () => {
    const ended = { ...plan, starts_at: new Date(Date.now() - 7200000).toISOString(), ends_at: new Date(Date.now() - 3600000).toISOString() };
    render(<PlanCard plan={ended} rotationSeed={0} />);
    expect(screen.getByText("ENDED")).toBeInTheDocument();
  });
});
