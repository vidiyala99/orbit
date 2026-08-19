import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import AboutPage from "../page";

describe("About page", () => {
  it("renders the thesis headline and body", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { name: /a cover letter used to cost something/i })).toBeInTheDocument();
    expect(screen.getByText(/the one signal ai still can't fake/i)).toBeInTheDocument();
  });
});
