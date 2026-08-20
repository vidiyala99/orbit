import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import AboutPage from "../page";

describe("About page", () => {
  it("renders the thesis headline and body", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { name: /in-person is the only thing that still works/i })).toBeInTheDocument();
    expect(screen.getByText(/the one thing that actually moves the needle/i)).toBeInTheDocument();
  });
});
