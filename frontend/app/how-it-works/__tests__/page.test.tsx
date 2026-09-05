import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HowItWorksPage from "../page";

describe("How it works page", () => {
  it("renders all three steps with their titles", () => {
    render(<HowItWorksPage />);
    expect(screen.getByText(/see the map/i)).toBeInTheDocument();
    expect(screen.getByText(/organize an event/i)).toBeInTheDocument();
    expect(screen.getByText(/research the room/i)).toBeInTheDocument();
  });

  it("shows the stamp badge illustration on step 3", () => {
    render(<HowItWorksPage />);
    expect(screen.getByText(/met in person/i)).toBeInTheDocument();
  });
});
