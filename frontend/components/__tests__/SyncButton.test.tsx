import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import SyncButton from "../SyncButton";
import * as api from "@/lib/api";
import * as auth from "@/lib/auth";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }),
}));

afterEach(() => {
  vi.restoreAllMocks();
  refresh.mockClear();
});

describe("SyncButton", () => {
  it("shows 'never' when there is no last sync time", () => {
    render(<SyncButton lastSyncedAt={null} lumaConnected />);
    expect(screen.getByText(/never/i)).toBeInTheDocument();
  });

  it("asks to Connect Luma when disconnected", async () => {
    const syncLuma = vi.spyOn(api, "syncLuma");
    render(<SyncButton lastSyncedAt={null} lumaConnected={false} />);
    fireEvent.click(screen.getByRole("button", { name: /sync now/i }));
    expect(await screen.findByText(/connect luma first/i)).toBeInTheDocument();
    expect(syncLuma).not.toHaveBeenCalled();
  });

  it("calls Luma sync, shows pending state, and refreshes on success", async () => {
    vi.spyOn(auth, "ensureClientToken").mockResolvedValue("token-123");
    let resolveSync: (value: unknown) => void = () => {};
    const syncLuma = vi.spyOn(api, "syncLuma").mockReturnValue(
      new Promise((resolve) => {
        resolveSync = resolve;
      }),
    );

    render(<SyncButton lastSyncedAt={null} lumaConnected />);
    fireEvent.click(screen.getByRole("button", { name: /sync now/i }));

    await waitFor(() => expect(syncLuma).toHaveBeenCalledWith("token-123"));
    expect(await screen.findByRole("button", { name: /syncing/i })).toBeDisabled();

    resolveSync({ events: 2, people: 14, connected: true });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(await screen.findByText(/synced 2 events, 14 guests/i)).toBeInTheDocument();
  });

  it("shows an error message and re-enables the button when the sync fails", async () => {
    vi.spyOn(auth, "ensureClientToken").mockResolvedValue("token-123");
    vi.spyOn(api, "syncLuma").mockRejectedValue(new Error("Luma not connected — call /me/luma/connect first"));

    render(<SyncButton lastSyncedAt={null} lumaConnected />);
    fireEvent.click(screen.getByRole("button", { name: /sync now/i }));

    expect(await screen.findByText(/luma not connected/i)).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /sync now/i })).not.toBeDisabled();
  });
});
