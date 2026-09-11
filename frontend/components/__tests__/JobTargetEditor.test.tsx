import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import JobTargetEditor from "../JobTargetEditor";
import * as api from "@/lib/api";
import * as auth from "@/lib/auth";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }),
}));

describe("JobTargetEditor", () => {
  it("shows a prompt to set a target when none is set", () => {
    render(<JobTargetEditor targetRole={null} targetIndustries={null} />);
    expect(screen.getByText(/set your job target/i)).toBeInTheDocument();
  });

  it("shows a summary of the current target when one is set", () => {
    render(<JobTargetEditor targetRole="Product Manager" targetIndustries={["fintech", "climate"]} />);
    expect(screen.getByText(/looking for:/i)).toBeInTheDocument();
    expect(screen.getByText(/Product Manager/)).toBeInTheDocument();
    expect(screen.getByText(/fintech, climate/)).toBeInTheDocument();
  });

  it("opens the editor form on Edit and closes it on Cancel", () => {
    render(<JobTargetEditor targetRole={null} targetIndustries={null} />);
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(screen.getByPlaceholderText(/target role/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByPlaceholderText(/target role/i)).not.toBeInTheDocument();
  });

  it("saves the target and refreshes the page", async () => {
    vi.spyOn(auth, "getClientToken").mockReturnValue("token-123");
    const updateJobTarget = vi.spyOn(api, "updateJobTarget").mockResolvedValue({} as never);

    render(<JobTargetEditor targetRole={null} targetIndustries={null} />);
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByPlaceholderText(/target role/i), { target: { value: "Recruiter" } });
    fireEvent.change(screen.getByPlaceholderText(/industries/i), { target: { value: "fintech, climate" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(updateJobTarget).toHaveBeenCalledWith(
        { target_role: "Recruiter", target_industries: ["fintech", "climate"] },
        "token-123",
      );
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("shows an error message when saving fails", async () => {
    vi.spyOn(auth, "getClientToken").mockReturnValue("token-123");
    vi.spyOn(api, "updateJobTarget").mockRejectedValue(new Error("Could not save job target"));

    render(<JobTargetEditor targetRole={null} targetIndustries={null} />);
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText(/could not save job target/i)).toBeInTheDocument();
  });
});
