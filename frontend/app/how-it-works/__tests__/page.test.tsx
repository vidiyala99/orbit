import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HowItWorksPage from "../page";

describe("How it works page", () => {
  it("renders all three steps with their titles", () => {
    render(<HowItWorksPage />);
    expect(screen.getByText(/pick a location/i)).toBeInTheDocument();
    expect(screen.getByText(/pick a theme/i)).toBeInTheDocument();
    expect(screen.getByText(/meet nearby/i)).toBeInTheDocument();
  });

  it("shows the stamp badge illustration on step 3", () => {
    render(<HowItWorksPage />);
    expect(screen.getByText(/met in person/i)).toBeInTheDocument();
  });
});
