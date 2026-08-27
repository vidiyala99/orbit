import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import SignInPage from "../[[...sign-in]]/page";
import * as api from "@/lib/api";

const { pushMock, replaceMock, routerMock } = vi.hoisted(() => {
  const push = vi.fn();
  const replace = vi.fn();
  return { pushMock: push, replaceMock: replace, routerMock: { push, replace } };
});
// The real `useRouter` returns a stable object; returning a fresh one per call
// would re-fire the page's `useEffect([router])` on every render.
vi.mock("next/navigation", () => ({ useRouter: () => routerMock }));

const baseUser = {
  id: "u1", email: "a@b.com", email_verified_at: null, headline: null, linkedin_url: null,
  avatar_url: null, first_name: null, last_name: null, city: null, lat: null, lon: null,
  pain_points: null, pain_point_other: null, onboarded_at: null,
  google_calendar_connected: false,
};

describe("SignInPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    replaceMock.mockClear();
    document.cookie = "sc_token=; path=/; max-age=0";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("submits email and password, stores the token, and redirects to /onboarding when not yet onboarded", async () => {
    vi.spyOn(api, "login").mockResolvedValue({
      access_token: "tok456",
      user: { ...baseUser },
    });

    render(<SignInPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/onboarding"));
    expect(document.cookie).toContain("sc_token=tok456");
  });

  it("redirects to /today when the returned user is already onboarded", async () => {
    vi.spyOn(api, "login").mockResolvedValue({
      access_token: "tok456",
      user: { ...baseUser, onboarded_at: "2026-08-23T00:00:00Z" },
    });

    render(<SignInPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/today"));
  });

  it("redirects an already signed-in, onboarded user to /today without rendering the form", async () => {
    document.cookie = "sc_token=tok789; path=/";
    vi.spyOn(api, "fetchMe").mockResolvedValue({ ...baseUser, onboarded_at: "2026-08-23T00:00:00Z" });

    render(<SignInPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/today"));
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  });

  it("redirects an already signed-in, not-yet-onboarded user to /onboarding", async () => {
    document.cookie = "sc_token=tok789; path=/";
    vi.spyOn(api, "fetchMe").mockResolvedValue({ ...baseUser });

    render(<SignInPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/onboarding"));
  });

  it("clears a stale token and renders the form when fetchMe fails", async () => {
    document.cookie = "sc_token=stale; path=/";
    vi.spyOn(api, "fetchMe").mockRejectedValue(new Error("fetchMe failed: 401"));

    render(<SignInPage />);

    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument();
    expect(document.cookie).not.toContain("sc_token=stale");
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("renders the form immediately when there is no token", () => {
    render(<SignInPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("shows an error message on invalid credentials", async () => {
    vi.spyOn(api, "login").mockRejectedValue(new Error("invalid email or password"));

    render(<SignInPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });

  it("does not render the demo button when the flag is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_LOGIN_ENABLED", "");
    render(<SignInPage />);
    expect(screen.queryByRole("button", { name: /demo account/i })).not.toBeInTheDocument();
  });

  it("does not render the demo button when the flag is not exactly 'true'", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_LOGIN_ENABLED", "false");
    render(<SignInPage />);
    expect(screen.queryByRole("button", { name: /demo account/i })).not.toBeInTheDocument();
  });

  it("renders the demo button when the flag is on", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_LOGIN_ENABLED", "true");
    render(<SignInPage />);
    expect(screen.getByRole("button", { name: /continue with demo account/i })).toBeInTheDocument();
  });

  it("demo-logs in, stores the token, and redirects like a normal login", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_LOGIN_ENABLED", "true");
    const demoLogin = vi.spyOn(api, "demoLogin").mockResolvedValue({
      access_token: "demotok",
      user: { ...baseUser, onboarded_at: "2026-08-23T00:00:00Z" },
    });

    render(<SignInPage />);
    fireEvent.click(screen.getByRole("button", { name: /continue with demo account/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/today"));
    expect(demoLogin).toHaveBeenCalledTimes(1);
    expect(document.cookie).toContain("sc_token=demotok");
  });

  it("sends a not-yet-onboarded demo user to /onboarding", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_LOGIN_ENABLED", "true");
    vi.spyOn(api, "demoLogin").mockResolvedValue({ access_token: "demotok", user: { ...baseUser } });

    render(<SignInPage />);
    fireEvent.click(screen.getByRole("button", { name: /continue with demo account/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/onboarding"));
  });

  it("shows an error when demo login fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_LOGIN_ENABLED", "true");
    vi.spyOn(api, "demoLogin").mockRejectedValue(new Error("demo login is not enabled"));

    render(<SignInPage />);
    fireEvent.click(screen.getByRole("button", { name: /continue with demo account/i }));

    expect(await screen.findByText(/demo login is not enabled/i)).toBeInTheDocument();
  });
});
