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
  city: null,
  lat: null,
  lon: null,
  pain_points: null,
  pain_point_other: null,
  onboarded_at: null,
  google_calendar_connected: false,
};

async function renderWizard() {
  vi.spyOn(auth, "getClientToken").mockReturnValue("tok123");
  vi.spyOn(api, "fetchMe").mockResolvedValue({ ...baseUser });
  render(<OnboardingPage />);
  await screen.findByLabelText(/first name/i);
}

describe("OnboardingPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    replaceMock.mockClear();
    vi.restoreAllMocks();
  });

  it("blocks advancing past step 1 when name fields are empty", async () => {
    await renderWizard();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(await screen.findByText(/first and last name are required/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
  });

  it("navigates forward and back through the steps", async () => {
    await renderWizard();

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Lovelace" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(await screen.findByLabelText(/^city$/i)).toBeInTheDocument();
    expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /back/i }));

    expect(await screen.findByLabelText(/first name/i)).toHaveValue("Ada");
  });

  it("blocks advancing past step 2 when city is empty", async () => {
    await renderWizard();

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Lovelace" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await screen.findByLabelText(/^city$/i);

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(await screen.findByText(/city is required/i)).toBeInTheDocument();
  });

  async function advanceToStep3() {
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Lovelace" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await screen.findByLabelText(/^city$/i);

    fireEvent.change(screen.getByLabelText(/^city$/i), { target: { value: "Austin, TX" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await screen.findByText(/step 3 of 3/i);
  }

  it("reveals and hides the free-text input when Other is toggled", async () => {
    await renderWizard();
    await advanceToStep3();

    expect(screen.queryByLabelText(/tell us more/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/^other$/i));
    expect(await screen.findByLabelText(/tell us more/i)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/^other$/i));
    expect(screen.queryByLabelText(/tell us more/i)).not.toBeInTheDocument();
  });

  it("blocks submit when no pain point is selected", async () => {
    await renderWizard();
    await advanceToStep3();

    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    expect(await screen.findByText(/select at least one option/i)).toBeInTheDocument();
  });

  it("submits the PATCH and redirects to /attendees on success", async () => {
    await renderWizard();
    await advanceToStep3();
    vi.spyOn(api, "submitOnboarding").mockResolvedValue({ ...baseUser, onboarded_at: "2026-08-23T00:00:00Z" });

    fireEvent.click(screen.getByLabelText(/cold outreach/i));
    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() =>
      expect(api.submitOnboarding).toHaveBeenCalledWith(
        {
          first_name: "Ada",
          last_name: "Lovelace",
          city: "Austin, TX",
          pain_points: ["cold_outreach"],
        },
        "tok123",
      ),
    );

    expect(await screen.findByText(/you're all set/i)).toBeInTheDocument();
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/attendees"), { timeout: 2000 });
  });

  it("shows an inline error on submit failure and keeps earlier step data", async () => {
    await renderWizard();
    await advanceToStep3();
    vi.spyOn(api, "submitOnboarding").mockRejectedValue(new Error("city could not be saved"));

    fireEvent.click(screen.getByLabelText(/cold outreach/i));
    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    expect(await screen.findByText(/city could not be saved/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(await screen.findByLabelText(/first name/i)).toHaveValue("Ada");
  });

  it("redirects to /attendees immediately if already onboarded", async () => {
    vi.spyOn(auth, "getClientToken").mockReturnValue("tok123");
    vi.spyOn(api, "fetchMe").mockResolvedValue({ ...baseUser, onboarded_at: "2026-08-23T00:00:00Z" });

    render(<OnboardingPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/attendees"));
  });

  it("redirects to /sign-in when there is no token", async () => {
    vi.spyOn(auth, "getClientToken").mockReturnValue(null);

    render(<OnboardingPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/sign-in"));
  });
});
