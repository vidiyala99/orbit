import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RoomsBrowser from "../RoomsBrowser";
import { RoomT } from "@/lib/types";

const createRoom = vi.fn();
vi.mock("@/lib/api", () => ({ createRoom: (...args: unknown[]) => createRoom(...args) }));
vi.mock("@/lib/auth", () => ({ getClientToken: () => "tok" }));

function makeRoom(over: Partial<RoomT> = {}): RoomT {
  return {
    id: "r1",
    creator_id: "u1",
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
  createRoom.mockReset();
});

function openSheet() {
  fireEvent.click(screen.getByRole("button", { name: /new room/i }));
}

describe("RoomsBrowser list", () => {
  it("renders a card per room with name, badge and purpose", () => {
    render(
      <RoomsBrowser
        initialRooms={[
          makeRoom(),
          makeRoom({ id: "r2", name: "YC W26 batchmates", visibility: "private", purpose: "job_hunting", member_count: 12 }),
        ]}
      />,
    );

    expect(screen.getByText("Founders Cowork Wednesdays")).toBeInTheDocument();
    expect(screen.getByText("Cowork")).toBeInTheDocument();
    expect(screen.getByText("YC W26 batchmates")).toBeInTheDocument();
    expect(screen.getByText("Job hunting")).toBeInTheDocument();
    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(screen.getByText("Private")).toBeInTheDocument();
  });

  it("links each card to the room detail page", () => {
    render(<RoomsBrowser initialRooms={[makeRoom()]} />);
    expect(screen.getByRole("link", { name: /founders cowork wednesdays/i })).toHaveAttribute(
      "href",
      "/rooms/r1",
    );
  });

  it("says 'Anywhere nearby' for a public room without coordinates", () => {
    render(<RoomsBrowser initialRooms={[makeRoom({ lat: null, lon: null })]} />);
    expect(screen.getByText(/anywhere nearby/i)).toBeInTheDocument();
  });

  it("says 'Invite only' for a private room without coordinates", () => {
    render(
      <RoomsBrowser initialRooms={[makeRoom({ lat: null, lon: null, visibility: "private" })]} />,
    );
    expect(screen.getByText(/invite only/i)).toBeInTheDocument();
  });

  it("shows the member count, singular for one member", () => {
    render(
      <RoomsBrowser
        initialRooms={[makeRoom(), makeRoom({ id: "r2", name: "Solo", member_count: 1 })]}
      />,
    );
    expect(screen.getByText(/7 members/)).toBeInTheDocument();
    expect(screen.getByText(/1 member(?!s)/)).toBeInTheDocument();
  });

  it("caps the avatar stack at four circles", () => {
    render(<RoomsBrowser initialRooms={[makeRoom({ member_count: 12 })]} />);
    expect(screen.getAllByTestId("room-avatar")).toHaveLength(4);
  });

  it("lays the cards out in a three-column grid from md up", () => {
    render(<RoomsBrowser initialRooms={[makeRoom()]} />);
    expect(screen.getByTestId("rooms-list").className).toMatch(/md:grid-cols-3/);
  });

  it("shows an empty state when there are no rooms", () => {
    render(<RoomsBrowser initialRooms={[]} />);
    expect(screen.getByText(/no rooms near you yet/i)).toBeInTheDocument();
  });
});

describe("RoomsBrowser create sheet validation", () => {
  it("is closed until the new-room button is pressed", () => {
    render(<RoomsBrowser initialRooms={[]} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    openSheet();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("disables Create until both a name and a purpose are set", () => {
    render(<RoomsBrowser initialRooms={[]} />);
    openSheet();
    const create = screen.getByRole("button", { name: /create room/i });
    expect(create).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Study crew" } });
    expect(create).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Study group" }));
    expect(create).toBeEnabled();
  });

  it("treats a whitespace-only name as empty", () => {
    render(<RoomsBrowser initialRooms={[]} />);
    openSheet();
    fireEvent.click(screen.getByRole("button", { name: "Cowork" }));
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "   " } });
    expect(screen.getByRole("button", { name: /create room/i })).toBeDisabled();
  });

  it("defaults visibility to public and lets it flip to private", () => {
    render(<RoomsBrowser initialRooms={[]} />);
    openSheet();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: /^public/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(within(dialog).getByRole("button", { name: /^private/i }));
    expect(within(dialog).getByRole("button", { name: /^private/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(dialog).getByRole("button", { name: /^public/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("only keeps one purpose chip selected at a time", () => {
    render(<RoomsBrowser initialRooms={[]} />);
    openSheet();
    fireEvent.click(screen.getByRole("button", { name: "Cowork" }));
    fireEvent.click(screen.getByRole("button", { name: "Coffee chat" }));
    expect(screen.getByRole("button", { name: "Cowork" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Coffee chat" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("RoomsBrowser create submission", () => {
  it("posts the backend enum values and prepends the new room", async () => {
    createRoom.mockResolvedValue(
      makeRoom({ id: "r-new", name: "Study crew", purpose: "study_group", member_count: 1 }),
    );
    render(<RoomsBrowser initialRooms={[makeRoom()]} />);
    openSheet();

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "  Study crew  " } });
    fireEvent.click(screen.getByRole("button", { name: "Study group" }));
    fireEvent.click(screen.getByRole("button", { name: /^private/i }));
    fireEvent.click(screen.getByRole("button", { name: /create room/i }));

    await waitFor(() => expect(createRoom).toHaveBeenCalled());
    expect(createRoom.mock.calls[0][0]).toEqual({
      name: "Study crew",
      purpose: "study_group",
      visibility: "private",
    });
    expect(createRoom.mock.calls[0][1]).toBe("tok");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const names = screen.getAllByTestId("room-name").map((el) => el.textContent);
    expect(names).toEqual(["Study crew", "Founders Cowork Wednesdays"]);
  });

  it("surfaces an error and keeps the sheet open when creation fails", async () => {
    createRoom.mockRejectedValue(new Error("createRoom failed: 500"));
    render(<RoomsBrowser initialRooms={[]} />);
    openSheet();
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Study crew" } });
    fireEvent.click(screen.getByRole("button", { name: "Study group" }));
    fireEvent.click(screen.getByRole("button", { name: /create room/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/createRoom failed: 500/);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("resets the form after a successful create", async () => {
    createRoom.mockResolvedValue(makeRoom({ id: "r-new", name: "Study crew" }));
    render(<RoomsBrowser initialRooms={[]} />);
    openSheet();
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Study crew" } });
    fireEvent.click(screen.getByRole("button", { name: "Study group" }));
    fireEvent.click(screen.getByRole("button", { name: /create room/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    openSheet();
    expect(screen.getByLabelText(/name/i)).toHaveValue("");
    expect(screen.getByRole("button", { name: /create room/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^public/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
