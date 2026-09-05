import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import EventRoomView from "../EventRoomView";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const togglePresenceOn = vi.fn();
const togglePresenceOff = vi.fn();
const fetchNearbyCandidates = vi.fn();
const startThread = vi.fn();
vi.mock("@/lib/api", () => ({
  togglePresenceOn: (...args: unknown[]) => togglePresenceOn(...args),
  togglePresenceOff: (...args: unknown[]) => togglePresenceOff(...args),
  fetchNearbyCandidates: (...args: unknown[]) => fetchNearbyCandidates(...args),
  startThread: (...args: unknown[]) => startThread(...args),
}));

const priya = {
  user_id: "u-priya",
  first_name: "Priya",
  last_name: "K.",
  headline: null,
  intent_tags: ["co_founder", "customers"],
  match_score: 0.92,
  why_meet: "Overlaps with you on co-founder — worth a 30-second hello.",
};

const marcus = {
  user_id: "u-marcus",
  first_name: "Marcus",
  last_name: "T.",
  headline: null,
  intent_tags: ["investors"],
  match_score: 0.61,
};

function stubGeolocation(coords: { latitude: number; longitude: number } | "deny") {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: (resolve: PositionCallback, reject?: PositionErrorCallback) => {
        if (coords === "deny") {
          reject?.({ code: 1, message: "denied" } as GeolocationPositionError);
        } else {
          resolve({ coords, timestamp: Date.now() } as GeolocationPosition);
        }
      },
    },
  });
}

beforeEach(() => {
  push.mockReset();
  togglePresenceOn.mockReset();
  togglePresenceOff.mockReset();
  fetchNearbyCandidates.mockReset();
  startThread.mockReset();
  togglePresenceOn.mockResolvedValue({ id: "p1" });
  fetchNearbyCandidates.mockResolvedValue([priya, marcus]);
  stubGeolocation({ latitude: 37.44, longitude: -122.14 });
});

describe("EventRoomView — off", () => {
  it("renders the toggle button and no candidates", () => {
    render(<EventRoomView token="tok" />);
    expect(screen.getByRole("button", { name: /open to meeting people/i })).toBeInTheDocument();
    expect(screen.queryByText(/priya/i)).not.toBeInTheDocument();
  });
});

describe("EventRoomView — turning on", () => {
  it("toggles presence on and shows ranked candidates", async () => {
    render(<EventRoomView token="tok" />);
    fireEvent.click(screen.getByRole("button", { name: /open to meeting people/i }));

    expect(await screen.findByText(/priya/i)).toBeInTheDocument();
    expect(screen.getByText(/marcus/i)).toBeInTheDocument();
    expect(togglePresenceOn).toHaveBeenCalledWith(37.44, -122.14, "tok");
    expect(fetchNearbyCandidates).toHaveBeenCalledWith("tok");
  });

  it("shows candidates in the order the API returned them, with a match score chip each", async () => {
    render(<EventRoomView token="tok" />);
    fireEvent.click(screen.getByRole("button", { name: /open to meeting people/i }));

    await screen.findByText(/priya/i);
    const names = screen.getAllByText(/priya|marcus/i).map((el) => el.textContent);
    expect(names[0]).toMatch(/priya/i);
    expect(screen.getByText("92% match")).toBeInTheDocument();
    expect(screen.getByText("61% match")).toBeInTheDocument();
    expect(screen.getByText(/overlaps with you on co-founder/i)).toBeInTheDocument();
  });

  it("shows an inline error and never calls togglePresenceOn when geolocation is denied", async () => {
    stubGeolocation("deny");
    render(<EventRoomView token="tok" />);
    fireEvent.click(screen.getByRole("button", { name: /open to meeting people/i }));

    expect(await screen.findByText(/location access is needed/i)).toBeInTheDocument();
    expect(togglePresenceOn).not.toHaveBeenCalled();
    expect(screen.queryByText(/priya/i)).not.toBeInTheDocument();
  });

  it("shows an empty-room message when there are no other candidates", async () => {
    fetchNearbyCandidates.mockResolvedValue([]);
    render(<EventRoomView token="tok" />);
    fireEvent.click(screen.getByRole("button", { name: /open to meeting people/i }));

    expect(await screen.findByText(/no one else nearby/i)).toBeInTheDocument();
  });
});

describe("EventRoomView — turning off", () => {
  it("calls togglePresenceOff and clears the candidate list", async () => {
    render(<EventRoomView token="tok" />);
    fireEvent.click(screen.getByRole("button", { name: /open to meeting people/i }));
    await screen.findByText(/priya/i);

    fireEvent.click(screen.getByRole("button", { name: /stop/i }));

    await waitFor(() => expect(togglePresenceOff).toHaveBeenCalledWith("tok"));
    expect(screen.queryByText(/priya/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open to meeting people/i })).toBeInTheDocument();
  });
});

describe("EventRoomView — Say hi", () => {
  it("starts a thread and routes to the chat", async () => {
    startThread.mockResolvedValue({ id: "thread-1" });
    render(<EventRoomView token="tok" />);
    fireEvent.click(screen.getByRole("button", { name: /open to meeting people/i }));
    await screen.findByText(/priya/i);

    fireEvent.click(screen.getAllByRole("button", { name: /say hi/i })[0]);

    await waitFor(() => expect(startThread).toHaveBeenCalledWith("u-priya", "tok"));
    expect(push).toHaveBeenCalledWith("/chats/thread-1");
  });
});
