import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import EventResearchPanel from "../EventResearchPanel";
import * as api from "@/lib/api";

describe("EventResearchPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("is visible before anyone clicks and loads Linkup research", async () => {
    vi.spyOn(api, "researchEvent").mockResolvedValue({
      answer: "Founders coffee draws operators and angels.",
      sources: [{ title: "Luma", url: "https://lu.ma/x" }],
      provider: "linkup",
    });

    render(<EventResearchPanel token="tok" query="founders coffee" />);

    expect(screen.getByRole("heading", { name: /research this event/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /run deep research/i }));

    expect(await screen.findByText(/founders coffee draws operators/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /luma/i })).toHaveAttribute("href", "https://lu.ma/x");
    expect(screen.getByText(/live via linkup/i)).toBeInTheDocument();
    expect(api.researchEvent).toHaveBeenCalledWith({ query: "founders coffee", planId: undefined }, "tok");
  });

  it("shows an error if research fails", async () => {
    vi.spyOn(api, "researchEvent").mockRejectedValue(new Error("Research failed"));
    render(<EventResearchPanel token="tok" planId="p1" />);
    fireEvent.click(screen.getByRole("button", { name: /run deep research/i }));
    expect(await screen.findByText(/research failed/i)).toBeInTheDocument();
  });
});
