import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SignInPage from "../[[...sign-in]]/page";
import * as api from "@/lib/api";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

describe("SignInPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    document.cookie = "sc_token=; path=/; max-age=0";
  });

  it("submits email and password, stores the token, and redirects to /today", async () => {
    vi.spyOn(api, "login").mockResolvedValue({
      access_token: "tok456",
      user: { id: "u1", email: "a@b.com", email_verified_at: null, name: "A", headline: null, linkedin_url: null, avatar_url: null },
    });

    render(<SignInPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/today"));
    expect(document.cookie).toContain("sc_token=tok456");
  });

  it("shows an error message on invalid credentials", async () => {
    vi.spyOn(api, "login").mockRejectedValue(new Error("invalid email or password"));

    render(<SignInPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });
});
