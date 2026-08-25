import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PlanFeed from "../PlanFeed";

const makePlan = (id: string, text: string) => ({
  id, user_id: "u1", text,
  activity: "coffee", openness: "open_to_chat", detail: null,
  lat: 37.44, lon: -122.14,
  starts_at: new Date(Date.now() - 60000).toISOString(),
  ends_at: new Date(Date.now() + 3600000).toISOString(),
});

describe("PlanFeed", () => {
  it("renders one card per plan", () => {
    render(<PlanFeed plans={[makePlan("1", "Coffee chat"), makePlan("2", "Meetup")]} />);
    expect(screen.getByText("Coffee chat")).toBeInTheDocument();
    expect(screen.getByText("Meetup")).toBeInTheDocument();
  });

  it("shows an empty state with no plans", () => {
    render(<PlanFeed plans={[]} />);
    expect(screen.getByText(/no plans/i)).toBeInTheDocument();
  });
});
