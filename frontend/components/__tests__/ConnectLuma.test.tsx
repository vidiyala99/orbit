import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import ConnectLuma from "../ConnectLuma";
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

describe("ConnectLuma — not connected", () => {
  it("shows a Connect Luma button", () => {
    render(<ConnectLuma lumaConnected={false} />);
    expect(screen.getByRole("button", { name: /connect luma/i })).toBeInTheDocument();
  });

  it("opens Actintro-only email step — no Luma redirect CTA", () => {
    render(<ConnectLuma lumaConnected={false} />);
    fireEvent.click(screen.getByRole("button", { name: /connect luma/i }));
    expect(screen.getByRole("dialog", { name: /connect luma/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/luma email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue with luma/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /open luma/i })).not.toBeInTheDocument();
  });

  it("sends code then shows code step", async () => {
    vi.spyOn(auth, "ensureClientToken").mockResolvedValue("tok-abc");
    const startSpy = vi.spyOn(api, "startLumaConnect").mockResolvedValue({
      status: "code_sent",
      email: "me@luma.test",
      message: "Check your email for a 6-digit Luma code.",
    });

    render(<ConnectLuma lumaConnected={false} />);
    fireEvent.click(screen.getByRole("button", { name: /connect luma/i }));
    fireEvent.change(screen.getByLabelText(/luma email/i), {
      target: { value: "me@luma.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue with luma/i }));

    await waitFor(() =>
      expect(startSpy).toHaveBeenCalledWith({ email: "me@luma.test" }, "tok-abc"),
    );
    expect(await screen.findByLabelText(/6-digit code/i)).toBeInTheDocument();
  });

  it("calls connectLuma with email+code and refreshes", async () => {
    vi.spyOn(auth, "ensureClientToken").mockResolvedValue("tok-abc");
    vi.spyOn(api, "startLumaConnect").mockResolvedValue({
      status: "code_sent",
      email: "me@luma.test",
      message: "ok",
    });
    const connectSpy = vi.spyOn(api, "connectLuma").mockResolvedValue({} as never);

    render(<ConnectLuma lumaConnected={false} />);
    fireEvent.click(screen.getByRole("button", { name: /connect luma/i }));
    fireEvent.change(screen.getByLabelText(/luma email/i), {
      target: { value: "me@luma.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue with luma/i }));
    await screen.findByLabelText(/6-digit code/i);
    fireEvent.change(screen.getByLabelText(/6-digit code/i), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^connect$/i }));

    await waitFor(() =>
      expect(connectSpy).toHaveBeenCalledWith(
        { email: "me@luma.test", code: "123456" },
        "tok-abc",
      ),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("shows error when send fails and stays on email step", async () => {
    vi.spyOn(auth, "ensureClientToken").mockResolvedValue("tok-abc");
    vi.spyOn(api, "startLumaConnect").mockRejectedValue(
      new Error("Couldn’t send the Luma code automatically."),
    );

    render(<ConnectLuma lumaConnected={false} />);
    fireEvent.click(screen.getByRole("button", { name: /connect luma/i }));
    fireEvent.change(screen.getByLabelText(/luma email/i), {
      target: { value: "me@luma.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue with luma/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn’t send/i);
    expect(screen.getByLabelText(/luma email/i)).toBeInTheDocument();
  });

  it("closes the modal when Cancel is clicked", () => {
    render(<ConnectLuma lumaConnected={false} />);
    fireEvent.click(screen.getByRole("button", { name: /connect luma/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("ConnectLuma — connected", () => {
  it("shows Luma connected chip and Sync guests button", () => {
    render(<ConnectLuma lumaConnected={true} />);
    expect(screen.getByText(/luma connected/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sync guests/i })).toBeInTheDocument();
  });

  it("calls syncLuma on Sync guests click and shows result", async () => {
    vi.spyOn(auth, "ensureClientToken").mockResolvedValue("tok-abc");
    const syncSpy = vi
      .spyOn(api, "syncLuma")
      .mockResolvedValue({ events: 2, people: 14, connected: true });

    render(<ConnectLuma lumaConnected={true} />);
    fireEvent.click(screen.getByRole("button", { name: /sync guests/i }));

    await waitFor(() => expect(syncSpy).toHaveBeenCalledWith("tok-abc"));
    expect(await screen.findByText(/synced 2 events, 14 guests/i)).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it("calls disconnectLuma on Disconnect click and refreshes", async () => {
    vi.spyOn(auth, "ensureClientToken").mockResolvedValue("tok-abc");
    const disconnectSpy = vi.spyOn(api, "disconnectLuma").mockResolvedValue({} as never);

    render(<ConnectLuma lumaConnected={true} />);
    fireEvent.click(screen.getByRole("button", { name: /disconnect/i }));

    await waitFor(() => expect(disconnectSpy).toHaveBeenCalledWith("tok-abc"));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });
});
