import type { ReactNode } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import FollowUpFocus from "../FocusCard";
import type { PersonSummaryT } from "@/lib/events";

const patchPersonMock = vi.fn();

vi.mock("@/lib/api", () => ({
  patchPerson: (...args: unknown[]) => patchPersonMock(...args),
}));

vi.mock("@/lib/auth", () => ({
  getClientToken: () => "test-token",
}));

// jsdom doesn't run real-time spring physics to completion, so
// AnimatePresence's exit hold (the outgoing card/rail-row staying mounted
// until its spring settles) never resolves within a test's wall clock —
// that's a rendering-fidelity gap in jsdom, not a bug in the component.
// Strip AnimatePresence down to a passthrough here so exits are instant,
// matching how these tests only assert on end-state DOM, not the
// animation itself.
vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</> };
});

function person(overrides: Partial<PersonSummaryT>): PersonSummaryT {
  return {
    id: "p-1",
    first_name: "Alex",
    last_name: "Rivera",
    role: "Partner, Westbound Ventures",
    priority: "needs_you",
    event_title: "Founders Cowork Wednesdays",
    event_ended_days_ago: 4,
    why: "Backs early infra bets",
    note_payload: null,
    dm_payload: null,
    ...overrides,
  };
}

const realMatchMedia = window.matchMedia;

/** The mobile-vs-desktop tree is picked by a real `window.matchMedia`
 *  check (`useIsDesktop` in FocusCard.tsx), not a CSS breakpoint — jsdom's
 *  stub (vitest.setup.ts) always reports `matches: false`, i.e. mobile, so
 *  desktop-path tests override it here and restore it afterward. */
function mockDesktop(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

describe("FollowUpFocus — mobile (drag-card) surface", () => {
  beforeEach(() => {
    patchPersonMock.mockReset();
    patchPersonMock.mockResolvedValue({});
  });

  it("renders the first person when the queue is non-empty", () => {
    const people = [person({ id: "p-1", first_name: "Alex" }), person({ id: "p-2", first_name: "Bo" })];
    render(<FollowUpFocus people={people} />);
    expect(screen.getByText(/alex rivera/i)).toBeInTheDocument();
    expect(screen.queryByText(/bo rivera/i)).not.toBeInTheDocument();
  });

  it("Skip calls PATCH with priority: later and advances to the next person", async () => {
    const people = [person({ id: "p-1", first_name: "Alex" }), person({ id: "p-2", first_name: "Bo" })];
    render(<FollowUpFocus people={people} />);

    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));

    await waitFor(() => expect(patchPersonMock).toHaveBeenCalledWith("p-1", { priority: "later" }, "test-token"));
    await waitFor(() => expect(screen.getByText(/bo rivera/i)).toBeInTheDocument());
    // The outgoing card is a framer-motion AnimatePresence exit (spring
    // slide-off) — it stays mounted in jsdom until that animation
    // completes, so give it a beat rather than asserting instantly.
    await waitFor(() => expect(screen.queryByText(/alex rivera/i)).not.toBeInTheDocument());
  });

  it("Follow up calls PATCH with followed_up_at and advances to the next person", async () => {
    const people = [person({ id: "p-1", first_name: "Alex" }), person({ id: "p-2", first_name: "Bo" })];
    render(<FollowUpFocus people={people} />);

    fireEvent.click(screen.getByRole("button", { name: /^follow up$/i }));

    await waitFor(() => expect(patchPersonMock).toHaveBeenCalledTimes(1));
    const [id, body, token] = patchPersonMock.mock.calls[0];
    expect(id).toBe("p-1");
    expect(typeof body.followed_up_at).toBe("string");
    expect(token).toBe("test-token");
    await waitFor(() => expect(screen.getByText(/bo rivera/i)).toBeInTheDocument());
  });

  it("shows an inline error and does not advance when the PATCH fails", async () => {
    patchPersonMock.mockRejectedValueOnce(new Error("boom"));
    const people = [person({ id: "p-1", first_name: "Alex" }), person({ id: "p-2", first_name: "Bo" })];
    render(<FollowUpFocus people={people} />);

    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/alex rivera/i)).toBeInTheDocument();
  });

  it("shows the end state when the queue empties out", async () => {
    const people = [person({ id: "p-1" })];
    render(<FollowUpFocus people={people} />);

    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));

    await waitFor(() => expect(screen.getByText(/all caught up/i)).toBeInTheDocument());
  });

  it("renders the end state immediately for an empty queue", () => {
    render(<FollowUpFocus people={[]} />);
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
  });

  it("tap zones navigate between people without calling PATCH", () => {
    const people = [person({ id: "p-1", first_name: "Alex" }), person({ id: "p-2", first_name: "Bo" })];
    render(<FollowUpFocus people={people} />);

    fireEvent.click(screen.getByRole("button", { name: /next person/i }));
    expect(screen.getByText(/bo rivera/i)).toBeInTheDocument();
    expect(patchPersonMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /previous person/i }));
    expect(screen.getByText(/alex rivera/i)).toBeInTheDocument();
    expect(patchPersonMock).not.toHaveBeenCalled();
  });

  it("expands into the full profile via the handle and shows the note/DM preview", async () => {
    const people = [person({ id: "p-1", first_name: "Alex" })];
    render(<FollowUpFocus people={people} />);

    expect(screen.queryByText(/note preview/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /expand full profile/i }));
    expect(screen.getByText(/note preview/i)).toBeInTheDocument();
    expect(screen.getByText(/dm preview/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /collapse profile/i }));
    // Collapse is also an AnimatePresence exit (height/opacity spring) —
    // same jsdom timing note as above.
    await waitFor(() => expect(screen.queryByText(/note preview/i)).not.toBeInTheDocument());
  });
});

describe("FollowUpFocus — desktop (card + rail) surface", () => {
  beforeEach(() => {
    patchPersonMock.mockReset();
    patchPersonMock.mockResolvedValue({});
    mockDesktop(true);
  });

  afterEach(() => {
    window.matchMedia = realMatchMedia;
  });

  it("renders the queue rail alongside the card, with the current person highlighted", async () => {
    const people = [person({ id: "p-1", first_name: "Alex" }), person({ id: "p-2", first_name: "Bo" })];
    render(<FollowUpFocus people={people} />);

    await waitFor(() => expect(screen.getByText(/follow-up queue/i)).toBeInTheDocument());
    const railButtons = screen.getAllByRole("button", { name: /alex rivera|bo rivera/i });
    expect(railButtons.length).toBeGreaterThanOrEqual(2);
    const activeButton = railButtons.find((b) => b.getAttribute("aria-current") === "true");
    expect(activeButton).toHaveTextContent(/alex rivera/i);
  });

  it("clicking a rail row jumps directly to that person", async () => {
    const people = [person({ id: "p-1", first_name: "Alex" }), person({ id: "p-2", first_name: "Bo" }), person({ id: "p-3", first_name: "Cy" })];
    render(<FollowUpFocus people={people} />);

    await waitFor(() => expect(screen.getByText(/follow-up queue/i)).toBeInTheDocument());
    const cyRailRow = screen.getAllByRole("button", { name: /cy rivera/i })[0];
    fireEvent.click(cyRailRow);

    expect(screen.getByText(/3 of 3 to follow up/i)).toBeInTheDocument();
  });

  it("ArrowRight/ArrowLeft keys advance and reverse through the queue", async () => {
    const people = [person({ id: "p-1", first_name: "Alex" }), person({ id: "p-2", first_name: "Bo" })];
    render(<FollowUpFocus people={people} />);

    await waitFor(() => expect(screen.getByText(/1 of 2 to follow up/i)).toBeInTheDocument());

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText(/2 of 2 to follow up/i)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText(/1 of 2 to follow up/i)).toBeInTheDocument();
  });

  it("shows the caught-up end state with no rail when the queue is empty", async () => {
    render(<FollowUpFocus people={[]} />);
    await waitFor(() => expect(screen.getByText(/all caught up/i)).toBeInTheDocument());
    expect(screen.queryByText(/follow-up queue/i)).not.toBeInTheDocument();
  });
});
