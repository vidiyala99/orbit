import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import RoomWorkspace from "../RoomWorkspace";

vi.mock("@/lib/api", () => ({
  fetchRoomMessages: vi.fn().mockResolvedValue([]),
  postRoomMessage: vi.fn(),
  fetchRoomAvailability: vi.fn().mockResolvedValue({ members: [] }),
  createRoomProposal: vi.fn(),
  confirmRoomProposal: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getClientToken: () => "tok" }));

function renderWorkspace() {
  return render(
    <RoomWorkspace
      roomId="r1"
      currentUserId="u1"
      initialMessages={[]}
      initialProposals={[]}
    />,
  );
}

describe("RoomWorkspace", () => {
  it("opens on the chat panel", () => {
    renderWorkspace();
    expect(screen.getByRole("tab", { name: /chat/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("chat-panel")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("schedule-panel")).toHaveAttribute("data-active", "false");
  });

  it("switches to the schedule panel when its tab is pressed", () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole("tab", { name: /time/i }));
    expect(screen.getByTestId("schedule-panel")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("chat-panel")).toHaveAttribute("data-active", "false");
  });

  it("keeps both panels mounted so the desktop split can show them side by side", () => {
    renderWorkspace();
    expect(screen.getByRole("log", { name: /room messages/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /propose this time/i })).toBeInTheDocument();
  });
});
