import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SignUpPage from "../[[...sign-up]]/page";
import * as api from "@/lib/api";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

describe("SignUpPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    document.cookie = "sc_token=; path=/; max-age=0";
  });

  it("submits email, password, and name, stores the token, and redirects to /today", async () => {
    vi.spyOn(api, "signup").mockResolvedValue({
      access_token: "tok123",
      user: { id: "u1", email: "a@b.com", email_verified_at: null, name: "A", headline: null, linkedin_url: null, avatar_url: null },
    });

    render(<SignUpPage />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/today"));
    expect(document.cookie).toContain("sc_token=tok123");
  });

  it("shows an error message when signup fails", async () => {
    vi.spyOn(api, "signup").mockRejectedValue(new Error("email already registered"));

    render(<SignUpPage />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/email already registered/i)).toBeInTheDocument();
  });
});
