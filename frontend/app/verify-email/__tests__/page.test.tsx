import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import VerifyEmailPage from "../page";
import * as api from "@/lib/api";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("token=abc123"),
}));

describe("VerifyEmailPage", () => {
  it("calls verifyEmail with the token from the query string and shows success", async () => {
    const spy = vi.spyOn(api, "verifyEmail").mockResolvedValue(undefined);
    render(<VerifyEmailPage />);
    expect(await screen.findByText(/verified/i)).toBeInTheDocument();
    expect(spy).toHaveBeenCalledWith("abc123");
  });

  it("shows an error if verification fails", async () => {
    vi.spyOn(api, "verifyEmail").mockRejectedValue(new Error("invalid or expired token"));
    render(<VerifyEmailPage />);
    expect(await screen.findByText(/invalid or expired token/i)).toBeInTheDocument();
  });
});
