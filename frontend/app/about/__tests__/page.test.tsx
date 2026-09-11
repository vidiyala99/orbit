import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import AboutPage from "../page";

describe("About page", () => {
  it("renders the thesis headline and body", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { name: /why orbit exists/i })).toBeInTheDocument();
    expect(screen.getByText(/orbit is the memory/i)).toBeInTheDocument();
  });
});
