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
    render(<SyncButton lastSyncedAt={null} eventId="evt-1" />);
    expect(screen.getByText(/never/i)).toBeInTheDocument();
  });

  it("is disabled when there is no event to sync", () => {
    render(<SyncButton lastSyncedAt={null} eventId={null} />);
    expect(screen.getByRole("button", { name: /sync now/i })).toBeDisabled();
  });

  it("calls the sync endpoint with the event id, shows pending state, and refreshes on success", async () => {
    vi.spyOn(auth, "getClientToken").mockReturnValue("token-123");
    let resolveSync: (value: unknown) => void = () => {};
    const syncEvent = vi.spyOn(api, "syncEvent").mockReturnValue(
      new Promise((resolve) => {
        resolveSync = resolve;
      }),
    );

    render(<SyncButton lastSyncedAt={null} eventId="evt-1" />);
    fireEvent.click(screen.getByRole("button", { name: /sync now/i }));

    expect(syncEvent).toHaveBeenCalledWith("evt-1", "token-123");
    expect(await screen.findByRole("button", { name: /syncing/i })).toBeDisabled();

    resolveSync({});
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("shows an error message and re-enables the button when the sync fails", async () => {
    vi.spyOn(auth, "getClientToken").mockReturnValue("token-123");
    vi.spyOn(api, "syncEvent").mockRejectedValue(new Error("syncEvent failed: 500"));

    render(<SyncButton lastSyncedAt={null} eventId="evt-1" />);
    fireEvent.click(screen.getByRole("button", { name: /sync now/i }));

    expect(await screen.findByText(/syncEvent failed: 500/i)).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /sync now/i })).not.toBeDisabled();
  });

  it("does nothing when clicked with no event id", () => {
    const syncEvent = vi.spyOn(api, "syncEvent");
    render(<SyncButton lastSyncedAt={null} eventId={null} />);
    fireEvent.click(screen.getByRole("button", { name: /sync now/i }));
    expect(syncEvent).not.toHaveBeenCalled();
  });
});
