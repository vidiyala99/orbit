import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import OnboardingPage from "../page";
import * as api from "@/lib/api";
import * as auth from "@/lib/auth";

const pushMock = vi.fn();
const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

const baseUser = {
  id: "u1",
  email: "a@b.com",
  email_verified_at: null,
  headline: null,
  linkedin_url: null,
  avatar_url: null,
  first_name: null,
  last_name: null,
  onboarded_at: null,
  luma_connected: false,
};

async function renderForm() {
  vi.spyOn(auth, "getClientToken").mockReturnValue("tok123");
  vi.spyOn(api, "fetchMe").mockResolvedValue({ ...baseUser });
  render(<OnboardingPage />);
  await screen.findByLabelText(/first name/i);
}

function fillName() {
  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Ada" } });
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Lovelace" } });
}

describe("OnboardingPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    replaceMock.mockClear();
    vi.restoreAllMocks();
  });

  it("asks only for a name: no city or pain-point steps", async () => {
    await renderForm();

    expect(screen.queryByLabelText(/^city$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/frustrating/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/step \d of/i)).not.toBeInTheDocument();
  });

  it("blocks submit when name fields are empty", async () => {
    await renderForm();
    const submit = vi.spyOn(api, "submitOnboarding");

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByText(/first and last name are required/i)).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });

  it("submits the name and redirects to /home on success", async () => {
    await renderForm();
    vi.spyOn(api, "submitOnboarding").mockResolvedValue({ ...baseUser, onboarded_at: "2026-08-23T00:00:00Z" });

    fillName();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() =>
      expect(api.submitOnboarding).toHaveBeenCalledWith({ first_name: "Ada", last_name: "Lovelace" }, "tok123"),
    );
    expect(await screen.findByText(/you're all set/i)).toBeInTheDocument();
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/home"), { timeout: 2000 });
  });

  it("shows an inline error on submit failure and keeps the typed name", async () => {
    await renderForm();
    vi.spyOn(api, "submitOnboarding").mockRejectedValue(new Error("could not be saved"));

    fillName();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByText(/could not be saved/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toHaveValue("Ada");
  });

  it("redirects to /home immediately if already onboarded", async () => {
    vi.spyOn(auth, "getClientToken").mockReturnValue("tok123");
    vi.spyOn(api, "fetchMe").mockResolvedValue({ ...baseUser, onboarded_at: "2026-08-23T00:00:00Z" });

    render(<OnboardingPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/home"));
  });

  it("redirects to /sign-in when there is no token", async () => {
    vi.spyOn(auth, "getClientToken").mockReturnValue(null);

    render(<OnboardingPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/sign-in"));
  });
});
