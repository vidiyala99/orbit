import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RoomDetailPage from "../[roomId]/page";
import { RoomT } from "@/lib/types";

const cookieValue = vi.fn<() => string | undefined>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "sc_token" ? { value: cookieValue() } : undefined),
  }),
}));

const fetchRoom = vi.fn();
const joinRoom = vi.fn();
const addRoomMember = vi.fn();
const leaveRoom = vi.fn();
const fetchMe = vi.fn();
const fetchRoomMessages = vi.fn();
const fetchRoomProposals = vi.fn();
vi.mock("@/lib/api", () => ({
  fetchRoom: (...args: unknown[]) => fetchRoom(...args),
  joinRoom: (...args: unknown[]) => joinRoom(...args),
  addRoomMember: (...args: unknown[]) => addRoomMember(...args),
  leaveRoom: (...args: unknown[]) => leaveRoom(...args),
  fetchMe: (...args: unknown[]) => fetchMe(...args),
  fetchRoomMessages: (...args: unknown[]) => fetchRoomMessages(...args),
  fetchRoomProposals: (...args: unknown[]) => fetchRoomProposals(...args),
  postRoomMessage: vi.fn(),
  fetchRoomAvailability: vi.fn().mockResolvedValue({ members: [] }),
  createRoomProposal: vi.fn(),
  confirmRoomProposal: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getClientToken: () => "tok" }));

const refresh = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
  usePathname: () => "/rooms/r1",
  useRouter: () => ({ push: vi.fn(), refresh }),
}));

function makeRoom(over: Partial<RoomT> = {}): RoomT {
  return {
    id: "r1",
    creator_id: "u9",
    name: "Founders Cowork Wednesdays",
    purpose: "cowork",
    visibility: "public",
    lat: 37.3861,
    lon: -122.0839,
    created_at: "2026-08-20T10:00:00Z",
    member_count: 7,
    is_member: false,
    ...over,
  };
}

beforeEach(() => {
  cookieValue.mockReset();
  fetchRoom.mockReset();
  joinRoom.mockReset();
  addRoomMember.mockReset();
  leaveRoom.mockReset();
  refresh.mockClear();
  redirect.mockClear();
  fetchMe.mockReset();
  fetchRoomMessages.mockReset();
  fetchRoomProposals.mockReset();
  cookieValue.mockReturnValue("tok");
  fetchRoom.mockResolvedValue(makeRoom());
  fetchMe.mockResolvedValue({ id: "u1" });
  fetchRoomMessages.mockResolvedValue([]);
  fetchRoomProposals.mockResolvedValue([]);
});

async function renderPage(roomId = "r1") {
  render(await RoomDetailPage({ params: Promise.resolve({ roomId }) }));
}

describe("RoomDetailPage access", () => {
  it("redirects anonymous visitors to sign in", async () => {
    cookieValue.mockReturnValue(undefined);
    await expect(RoomDetailPage({ params: Promise.resolve({ roomId: "r1" }) })).rejects.toThrow(
      "REDIRECT:/sign-in",
    );
  });

  it("fetches the room by the awaited route param", async () => {
    await renderPage("r7");
    expect(fetchRoom).toHaveBeenCalledWith("r7", "tok");
  });
});

describe("RoomDetailPage content", () => {
  it("shows the name, purpose, visibility and member count", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { name: "Founders Cowork Wednesdays" })).toBeInTheDocument();
    expect(screen.getByText("Cowork")).toBeInTheDocument();
    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(screen.getByText(/7 members/)).toBeInTheDocument();
  });

  it("links back to the rooms list", async () => {
    await renderPage();
    // The back link is aria-labelled so it doesn't collide with the "Rooms"
    // tab in the bottom nav.
    expect(screen.getByRole("link", { name: /back to rooms/i })).toHaveAttribute("href", "/rooms");
  });
});

describe("RoomDetailPage membership", () => {
  it("offers Join on a public room the viewer has not joined", async () => {
    await renderPage();
    expect(screen.getByRole("button", { name: /^join/i })).toBeInTheDocument();
  });

  it("joins and refreshes", async () => {
    joinRoom.mockResolvedValue(makeRoom({ is_member: true, member_count: 8 }));
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: /^join/i }));
    await waitFor(() => expect(joinRoom).toHaveBeenCalledWith("r1", "tok"));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("shows the member state instead of Join once joined", async () => {
    fetchRoom.mockResolvedValue(makeRoom({ is_member: true }));
    await renderPage();
    expect(screen.queryByRole("button", { name: /^join/i })).not.toBeInTheDocument();
    // Apostrophe-agnostic: the copy uses a typographic apostrophe (’), not '.
    expect(screen.getByText(/you.re a member/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /leave/i })).toBeInTheDocument();
  });

  it("does not offer Join on a private room", async () => {
    fetchRoom.mockResolvedValue(makeRoom({ visibility: "private", is_member: false }));
    await renderPage();
    expect(screen.queryByRole("button", { name: /^join/i })).not.toBeInTheDocument();
  });
});

describe("RoomDetailPage chat and schedule", () => {
  it("mounts neither for a non-member, and reads no members-only endpoint", async () => {
    await renderPage();
    expect(screen.queryByRole("log", { name: /room messages/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /propose this time/i })).not.toBeInTheDocument();
    expect(fetchRoomMessages).not.toHaveBeenCalled();
    expect(fetchRoomProposals).not.toHaveBeenCalled();
  });

  it("mounts both for a member, seeded from the server", async () => {
    fetchRoom.mockResolvedValue(makeRoom({ is_member: true }));
    fetchRoomMessages.mockResolvedValue([
      {
        id: "m1",
        room_id: "r1",
        sender_id: "u2",
        kind: "text",
        body: "Anyone in today?",
        plan_id: null,
        time_proposal_id: null,
        created_at: "2026-08-26T10:00:00Z",
        plan: null,
        time_proposal: null,
      },
    ]);
    await renderPage();

    expect(fetchRoomMessages).toHaveBeenCalledWith("r1", "tok");
    expect(fetchRoomProposals).toHaveBeenCalledWith("r1", "tok");
    expect(screen.getByText("Anyone in today?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /propose this time/i })).toBeInTheDocument();
  });
});

describe("RoomDetailPage add member", () => {
  it("is only offered on a private room the viewer belongs to", async () => {
    await renderPage();
    expect(screen.queryByLabelText(/add someone/i)).not.toBeInTheDocument();

    fetchRoom.mockResolvedValue(makeRoom({ visibility: "private", is_member: true }));
    await renderPage();
    expect(screen.getByLabelText(/add someone/i)).toBeInTheDocument();
  });

  it("posts the entered user id", async () => {
    fetchRoom.mockResolvedValue(makeRoom({ visibility: "private", is_member: true }));
    addRoomMember.mockResolvedValue(undefined);
    await renderPage();

    fireEvent.change(screen.getByLabelText(/add someone/i), { target: { value: " u42 " } });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));
    await waitFor(() => expect(addRoomMember).toHaveBeenCalledWith("r1", "u42", "tok"));
  });

  it("keeps Add disabled while the field is empty", async () => {
    fetchRoom.mockResolvedValue(makeRoom({ visibility: "private", is_member: true }));
    await renderPage();
    expect(screen.getByRole("button", { name: /^add$/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/add someone/i), { target: { value: "u42" } });
    expect(screen.getByRole("button", { name: /^add$/i })).toBeEnabled();
  });

  it("surfaces an add failure", async () => {
    fetchRoom.mockResolvedValue(makeRoom({ visibility: "private", is_member: true }));
    addRoomMember.mockRejectedValue(new Error("addRoomMember failed: 404"));
    await renderPage();
    fireEvent.change(screen.getByLabelText(/add someone/i), { target: { value: "nope" } });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/addRoomMember failed: 404/);
  });
});
