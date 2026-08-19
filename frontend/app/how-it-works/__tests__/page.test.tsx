import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HowItWorksPage from "../page";

describe("How it works page", () => {
  it("renders all three steps with their titles", () => {
    render(<HowItWorksPage />);
    expect(screen.getByText(/post where you'll be/i)).toBeInTheDocument();
    expect(screen.getByText(/get spotted before you arrive/i)).toBeInTheDocument();
    expect(screen.getByText(/leave with a stamp, not just an add/i)).toBeInTheDocument();
  });

  it("shows the stamp badge illustration on step 3", () => {
    render(<HowItWorksPage />);
    expect(screen.getByText(/met in person/i)).toBeInTheDocument();
  });
});
