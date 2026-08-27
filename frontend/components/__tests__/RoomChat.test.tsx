import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import RoomChat from "../RoomChat";
import { PlanT, RoomMessageT, TimeProposalT } from "@/lib/types";

const fetchRoomMessages = vi.fn();
const postRoomMessage = vi.fn();

vi.mock("@/lib/api", () => ({
  fetchRoomMessages: (...args: unknown[]) => fetchRoomMessages(...args),
  postRoomMessage: (...args: unknown[]) => postRoomMessage(...args),
}));
vi.mock("@/lib/auth", () => ({ getClientToken: () => "tok" }));

function makeText(over: Partial<RoomMessageT> = {}): RoomMessageT {
  return {
    id: "m1",
    room_id: "r1",
    sender_id: "u2",
    kind: "text",
    body: "See you there",
    plan_id: null,
    time_proposal_id: null,
    created_at: "2026-08-26T10:00:00Z",
    plan: null,
    time_proposal: null,
    ...over,
  };
}

function makePlan(over: Partial<PlanT> = {}): PlanT {
  const now = Date.now();
  return {
    id: "p1",
    user_id: "u2",
    activity: "coffee",
    openness: "open_to_chat",
    detail: null,
    text: "Coffee at Blue Bottle, open to chat",
    lat: 37.38,
    lon: -122.08,
    starts_at: new Date(now - 30 * 60_000).toISOString(),
    ends_at: new Date(now + 30 * 60_000).toISOString(),
    ...over,
  };
}

function makeProposal(over: Partial<TimeProposalT> = {}): TimeProposalT {
  return {
    id: "tp1",
    room_id: "r1",
    proposer_id: "u2",
    starts_at: "2026-08-27T17:00:00.000Z",
    ends_at: "2026-08-27T18:00:00.000Z",
    status: "proposed",
    confirmed_at: null,
    created_at: "2026-08-26T10:00:00Z",
    confirmations: [],
    member_count: 3,
    confirmed_by_me: false,
    ...over,
  };
}

beforeEach(() => {
  fetchRoomMessages.mockReset();
  postRoomMessage.mockReset();
  fetchRoomMessages.mockResolvedValue([]);
});

describe("RoomChat message list", () => {
  it("shows an empty state when the room has no messages", () => {
    render(<RoomChat roomId="r1" currentUserId="u1" initialMessages={[]} />);
    expect(screen.getByText(/no messages yet/i)).toBeInTheDocument();
  });

  it("renders text messages, marking the caller's own differently", () => {
    render(
      <RoomChat
        roomId="r1"
        currentUserId="u1"
        initialMessages={[
          makeText(),
          makeText({ id: "m2", sender_id: "u1", body: "On my way" }),
        ]}
      />,
    );

    expect(screen.getByText("See you there")).toBeInTheDocument();
    const mine = screen.getByTestId("room-message-m2");
    expect(mine).toHaveAttribute("data-mine", "true");
    expect(screen.getByTestId("room-message-m1")).toHaveAttribute("data-mine", "false");
  });

  it("renders a plan_share as a card linking to the plan, with a LIVE tag while active", () => {
    render(
      <RoomChat
        roomId="r1"
        currentUserId="u1"
        initialMessages={[
          makeText({ id: "m3", kind: "plan_share", body: null, plan_id: "p1", plan: makePlan() }),
        ]}
      />,
    );

    const card = screen.getByTestId("plan-share-card");
    expect(card).toHaveTextContent("Coffee at Blue Bottle, open to chat");
    expect(card).toHaveTextContent("LIVE");
    expect(screen.getByRole("link", { name: /view plan/i })).toHaveAttribute("href", "/plans/p1");
  });

  it("omits the LIVE tag on a plan that has ended", () => {
    const past = Date.now() - 3 * 60 * 60_000;
    render(
      <RoomChat
        roomId="r1"
        currentUserId="u1"
        initialMessages={[
          makeText({
            id: "m3",
            kind: "plan_share",
            body: null,
            plan_id: "p1",
            plan: makePlan({
              starts_at: new Date(past).toISOString(),
              ends_at: new Date(past + 60 * 60_000).toISOString(),
            }),
          }),
        ]}
      />,
    );
    expect(screen.getByTestId("plan-share-card")).not.toHaveTextContent("LIVE");
  });

  it("renders a time_proposal as a card with day and time chips", () => {
    render(
      <RoomChat
        roomId="r1"
        currentUserId="u1"
        initialMessages={[
          makeText({
            id: "m4",
            kind: "time_proposal",
            body: "Does Thursday work?",
            time_proposal_id: "tp1",
            time_proposal: makeProposal(),
          }),
        ]}
      />,
    );

    const card = screen.getByTestId("time-proposal-card");
    expect(card).toHaveTextContent("Does Thursday work?");
    expect(card).toHaveTextContent(
      new Date("2026-08-27T17:00:00.000Z").toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    );
    expect(screen.getByTestId("proposal-status")).toHaveTextContent(/0 of 3 confirmed/i);
  });

  it("shows a confirmed time_proposal card as confirmed", () => {
    render(
      <RoomChat
        roomId="r1"
        currentUserId="u1"
        initialMessages={[
          makeText({
            id: "m4",
            kind: "time_proposal",
            body: null,
            time_proposal_id: "tp1",
            time_proposal: makeProposal({
              status: "confirmed",
              confirmed_at: "2026-08-26T12:00:00Z",
              confirmed_by_me: true,
              confirmations: [
                {
                  id: "c1",
                  proposal_id: "tp1",
                  room_member_id: "rm1",
                  user_id: "u1",
                  confirmed_at: "2026-08-26T12:00:00Z",
                },
              ],
            }),
          }),
        ]}
      />,
    );
    expect(screen.getByTestId("proposal-status")).toHaveTextContent(/confirmed/i);
  });
});

describe("RoomChat composer", () => {
  it("posts the trimmed draft and appends the returned message", async () => {
    postRoomMessage.mockResolvedValue(makeText({ id: "m9", sender_id: "u1", body: "Hi all" }));
    render(<RoomChat roomId="r1" currentUserId="u1" initialMessages={[]} />);

    fireEvent.change(screen.getByLabelText(/^message$/i), { target: { value: "  Hi all  " } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(postRoomMessage).toHaveBeenCalledWith("r1", "Hi all", "tok"));
    expect(await screen.findByText("Hi all")).toBeInTheDocument();
    expect(screen.getByLabelText(/^message$/i)).toHaveValue("");
  });

  it("keeps Send disabled for an empty or whitespace-only draft", () => {
    render(<RoomChat roomId="r1" currentUserId="u1" initialMessages={[]} />);
    const send = screen.getByRole("button", { name: /send/i });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/^message$/i), { target: { value: "   " } });
    expect(send).toBeDisabled();
  });

  it("surfaces an error and keeps the draft when sending fails", async () => {
    postRoomMessage.mockRejectedValue(new Error("postRoomMessage failed: 500"));
    render(<RoomChat roomId="r1" currentUserId="u1" initialMessages={[]} />);

    fireEvent.change(screen.getByLabelText(/^message$/i), { target: { value: "Hi" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/postRoomMessage failed: 500/);
    expect(screen.getByLabelText(/^message$/i)).toHaveValue("Hi");
  });
});

describe("RoomChat polling", () => {
  afterEach(() => vi.useRealTimers());

  it("replaces the list with what the poll returns", async () => {
    vi.useFakeTimers();
    fetchRoomMessages.mockResolvedValue([makeText({ id: "m5", body: "Fresh from the server" })]);
    render(<RoomChat roomId="r1" currentUserId="u1" initialMessages={[]} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    expect(fetchRoomMessages).toHaveBeenCalledWith("r1", "tok");
    expect(screen.getByText("Fresh from the server")).toBeInTheDocument();
  });
});
