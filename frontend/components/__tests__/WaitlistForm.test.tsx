import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import WaitlistForm from "../WaitlistForm";
import * as api from "@/lib/api";

describe("WaitlistForm", () => {
  it("submits the email and shows a confirmation with the live count", async () => {
    vi.spyOn(api, "joinWaitlist").mockResolvedValue(undefined);
    vi.spyOn(api, "fetchWaitlistCount").mockResolvedValue(42);

    render(<WaitlistForm />);
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: /join the waitlist/i }));

    expect(await screen.findByText(/you're on the list/i)).toBeInTheDocument();
    expect(await screen.findByText(/42/)).toBeInTheDocument();
  });

  it("shows an error message when joining fails", async () => {
    vi.spyOn(api, "joinWaitlist").mockRejectedValue(new Error("Could not join waitlist"));

    render(<WaitlistForm />);
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: /join the waitlist/i }));

    expect(await screen.findByText(/could not join waitlist/i)).toBeInTheDocument();
  });
});
