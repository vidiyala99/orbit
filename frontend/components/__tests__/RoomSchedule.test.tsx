import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RoomSchedule from "../RoomSchedule";
import { TimeProposalT } from "@/lib/types";

const fetchRoomAvailability = vi.fn();
const createRoomProposal = vi.fn();
const confirmRoomProposal = vi.fn();

vi.mock("@/lib/api", () => ({
  fetchRoomAvailability: (...args: unknown[]) => fetchRoomAvailability(...args),
  createRoomProposal: (...args: unknown[]) => createRoomProposal(...args),
  confirmRoomProposal: (...args: unknown[]) => confirmRoomProposal(...args),
}));
vi.mock("@/lib/auth", () => ({ getClientToken: () => "tok" }));

/** A local-time instant `dayOffset` days from now, on the hour. */
function at(dayOffset: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function makeProposal(over: Partial<TimeProposalT> = {}): TimeProposalT {
  return {
    id: "tp1",
    room_id: "r1",
    proposer_id: "u2",
    starts_at: at(1, 14),
    ends_at: at(1, 15),
    status: "proposed",
    confirmed_at: null,
    created_at: at(0, 9),
    confirmations: [],
    member_count: 3,
    confirmed_by_me: false,
    ...over,
  };
}

beforeEach(() => {
  fetchRoomAvailability.mockReset();
  createRoomProposal.mockReset();
  confirmRoomProposal.mockReset();
  fetchRoomAvailability.mockResolvedValue({ members: [] });
});

describe("RoomSchedule day picker", () => {
  it("shows seven days starting today, with today selected", () => {
    render(<RoomSchedule roomId="r1" currentUserId="u1" initialProposals={[]} />);
    const chips = screen.getAllByTestId(/^day-chip-/);
    expect(chips).toHaveLength(7);
    expect(chips[0]).toHaveAttribute("aria-pressed", "true");
    expect(chips[1]).toHaveAttribute("aria-pressed", "false");
  });

  it("dots only the days that already have a proposal", () => {
    render(<RoomSchedule roomId="r1" currentUserId="u1" initialProposals={[makeProposal()]} />);
    expect(screen.getByTestId("day-chip-1").querySelector("[data-testid='day-dot']")).not.toBeNull();
    expect(screen.getByTestId("day-chip-0").querySelector("[data-testid='day-dot']")).toBeNull();
  });

  it("moves the selection when another day is tapped", () => {
    render(<RoomSchedule roomId="r1" currentUserId="u1" initialProposals={[]} />);
    fireEvent.click(screen.getByTestId("day-chip-2"));
    expect(screen.getByTestId("day-chip-2")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("day-chip-0")).toHaveAttribute("aria-pressed", "false");
  });
});

describe("RoomSchedule timeline", () => {
  it("shows a proposed block only on the day it falls on", () => {
    render(<RoomSchedule roomId="r1" currentUserId="u1" initialProposals={[makeProposal()]} />);
    expect(screen.queryByTestId("proposed-block-tp1")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("day-chip-1"));
    expect(screen.getByTestId("proposed-block-tp1")).toBeInTheDocument();
  });

  it("loads availability for the selected day and renders each busy block", async () => {
    fetchRoomAvailability.mockResolvedValue({
      members: [
        { user_id: "u1", connected: true, busy: [{ starts_at: at(0, 10), ends_at: at(0, 11) }] },
        { user_id: "u2", connected: true, busy: [{ starts_at: at(0, 13), ends_at: at(0, 14) }] },
        { user_id: "u3", connected: false, busy: [] },
      ],
    });
    render(<RoomSchedule roomId="r1" currentUserId="u1" initialProposals={[]} />);

    await waitFor(() => expect(screen.getAllByTestId("busy-block")).toHaveLength(2));
    expect(fetchRoomAvailability.mock.calls[0][0]).toBe("r1");
    expect(fetchRoomAvailability.mock.calls[0][3]).toBe("tok");
  });

  it("re-reads availability when the day changes", async () => {
    render(<RoomSchedule roomId="r1" currentUserId="u1" initialProposals={[]} />);
    await waitFor(() => expect(fetchRoomAvailability).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId("day-chip-3"));
    await waitFor(() => expect(fetchRoomAvailability).toHaveBeenCalledTimes(2));
  });

  it("says so when nobody in the room has connected a calendar", async () => {
    fetchRoomAvailability.mockResolvedValue({
      members: [{ user_id: "u1", connected: false, busy: [] }],
    });
    render(<RoomSchedule roomId="r1" currentUserId="u1" initialProposals={[]} />);
    expect(await screen.findByText(/no connected calendars/i)).toBeInTheDocument();
  });
});

describe("RoomSchedule proposing", () => {
  it("stays disabled until an hour is picked, then posts that hour", async () => {
    createRoomProposal.mockResolvedValue(makeProposal({ id: "tp-new", starts_at: at(0, 15), ends_at: at(0, 16) }));
    render(<RoomSchedule roomId="r1" currentUserId="u1" initialProposals={[]} />);

    const propose = screen.getByRole("button", { name: /propose this time/i });
    expect(propose).toBeDisabled();

    fireEvent.click(screen.getByTestId("hour-15"));
    expect(propose).toBeEnabled();
    fireEvent.click(propose);

    await waitFor(() => expect(createRoomProposal).toHaveBeenCalled());
    expect(createRoomProposal.mock.calls[0][0]).toBe("r1");
    expect(createRoomProposal.mock.calls[0][1]).toEqual({
      starts_at: at(0, 15),
      ends_at: at(0, 16),
    });
    expect(createRoomProposal.mock.calls[0][2]).toBe("tok");
    expect(await screen.findByTestId("proposed-block-tp-new")).toBeInTheDocument();
  });

  it("surfaces an error when proposing fails", async () => {
    createRoomProposal.mockRejectedValue(new Error("createRoomProposal failed: 422"));
    render(<RoomSchedule roomId="r1" currentUserId="u1" initialProposals={[]} />);
    fireEvent.click(screen.getByTestId("hour-15"));
    fireEvent.click(screen.getByRole("button", { name: /propose this time/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/createRoomProposal failed: 422/);
  });
});

describe("RoomSchedule confirming", () => {
  it("confirms a proposal and reflects the new count", async () => {
    confirmRoomProposal.mockResolvedValue(
      makeProposal({
        confirmed_by_me: true,
        confirmations: [
          { id: "c1", proposal_id: "tp1", room_member_id: "rm1", user_id: "u1", confirmed_at: at(0, 9) },
        ],
      }),
    );
    render(<RoomSchedule roomId="r1" currentUserId="u1" initialProposals={[makeProposal()]} />);
    fireEvent.click(screen.getByTestId("day-chip-1"));

    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));
    await waitFor(() => expect(confirmRoomProposal).toHaveBeenCalledWith("r1", "tp1", "tok"));
    // Both the timeline block and the row beneath it carry the count.
    expect(await screen.findAllByText(/1 of 3 confirmed/i)).not.toHaveLength(0);
    expect(screen.queryByRole("button", { name: /^confirm/i })).not.toBeInTheDocument();
  });

  it("renders a confirmed proposal as a summary with a check per confirming member", () => {
    render(
      <RoomSchedule
        roomId="r1"
        currentUserId="u1"
        initialProposals={[
          makeProposal({
            status: "confirmed",
            confirmed_at: at(0, 9),
            confirmed_by_me: true,
            confirmations: [
              { id: "c1", proposal_id: "tp1", room_member_id: "rm1", user_id: "u1", confirmed_at: at(0, 9) },
              { id: "c2", proposal_id: "tp1", room_member_id: "rm2", user_id: "u2", confirmed_at: at(0, 9) },
              { id: "c3", proposal_id: "tp1", room_member_id: "rm3", user_id: "u3", confirmed_at: at(0, 9) },
            ],
          }),
        ]}
      />,
    );

    const summary = screen.getByTestId("confirmed-plan");
    expect(summary).toBeInTheDocument();
    expect(screen.getAllByTestId("confirmed-avatar")).toHaveLength(3);
  });

  it("shows nothing confirmed when no proposal has been agreed", () => {
    render(<RoomSchedule roomId="r1" currentUserId="u1" initialProposals={[makeProposal()]} />);
    expect(screen.queryByTestId("confirmed-plan")).not.toBeInTheDocument();
  });
});
