import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResetPasswordPage from "../page";
import * as api from "@/lib/api";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams("token=reset-tok"),
}));

describe("ResetPasswordPage", () => {
  beforeEach(() => pushMock.mockClear());

  it("submits the new password with the token from the query string", async () => {
    const spy = vi.spyOn(api, "resetPassword").mockResolvedValue(undefined);
    render(<ResetPasswordPage />);
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "newpassword2" } });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => expect(spy).toHaveBeenCalledWith("reset-tok", "newpassword2"));
    expect(await screen.findByText(/sign in/i)).toBeInTheDocument();
  });
});
