import type { ReactNode } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AccountMenu from "../AccountMenu";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const ensureClientTokenMock = vi.fn();
const clearClientTokenMock = vi.fn();
vi.mock("@/lib/auth", () => ({
  ensureClientToken: (...args: unknown[]) => ensureClientTokenMock(...args),
  clearClientToken: (...args: unknown[]) => clearClientTokenMock(...args),
}));

const fetchMeMock = vi.fn();
vi.mock("@/lib/api", () => ({
  fetchMe: (...args: unknown[]) => fetchMeMock(...args),
}));

// jsdom doesn't run real-time spring physics to completion — see the same
// note in FocusCard.test.tsx. Strip AnimatePresence to a passthrough so
// open/close is instant and tests assert end-state DOM, not the animation.
vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</> };
});

describe("AccountMenu", () => {
  beforeEach(() => {
    pushMock.mockClear();
    clearClientTokenMock.mockClear();
    ensureClientTokenMock.mockReset().mockResolvedValue("test-token");
    fetchMeMock.mockReset().mockResolvedValue({ email: "founder@orbit.dev" });
  });

  it("renders a closed trigger with no menu visible", () => {
    render(<AccountMenu />);
    expect(screen.getByRole("button", { name: "Account menu" })).toBeInTheDocument();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens the menu and shows the signed-in email", async () => {
    render(<AccountMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Account menu" }));
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("founder@orbit.dev")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Account menu" })).toHaveAttribute("aria-expanded", "true");
  });

  it("closes the menu when the trigger is clicked again", async () => {
    render(<AccountMenu />);
    const trigger = screen.getByRole("button", { name: "Account menu" });
    fireEvent.click(trigger);
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("closes the menu on outside click", async () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <AccountMenu />
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Account menu" }));
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId("outside"));
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("closes the menu on Escape", async () => {
    render(<AccountMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Account menu" }));
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("signs out: clears the client token and redirects to the landing page", async () => {
    render(<AccountMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Account menu" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Sign out" }));
    expect(clearClientTokenMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith("/");
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("falls back to a generic label when there is no token", async () => {
    ensureClientTokenMock.mockResolvedValue(null);
    render(<AccountMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Account menu" }));
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("Signed in")).toBeInTheDocument();
    expect(fetchMeMock).not.toHaveBeenCalled();
  });
});
