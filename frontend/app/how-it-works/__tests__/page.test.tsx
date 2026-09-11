import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HowItWorksPage from "../page";

describe("How it works page", () => {
  it("renders all three steps with their titles", () => {
    render(<HowItWorksPage />);
    expect(screen.getByText(/connect the guest list/i)).toBeInTheDocument();
    expect(screen.getByText(/it ranks who needs you first/i)).toBeInTheDocument();
    expect(screen.getByText(/copy the note it already wrote/i)).toBeInTheDocument();
  });
});
