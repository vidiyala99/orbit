import type { ReactNode } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import FollowUpFocus from "../FocusCard";
import type { PersonSummaryT } from "@/lib/events";

const triagePersonMock = vi.fn();

vi.mock("@/lib/api", () => ({
  triagePerson: (...args: unknown[]) => triagePersonMock(...args),
}));

vi.mock("@/lib/auth", () => ({
  getClientToken: () => "test-token",
}));

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
    event_title: "Build Fridays",
    event_ended_days_ago: 0,
    event_upcoming: true,
    why: "Backs early infra bets",
    note_payload: null,
    dm_payload: null,
    ...overrides,
  };
}

const realMatchMedia = window.matchMedia;

function mockLayout(layout: "phone" | "tablet" | "workbench") {
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    let matches = false;
    if (query.includes("max-width: 767")) matches = layout === "phone";
    else if (query.includes("min-width: 1024")) matches = layout === "workbench";
    return {
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    };
  }) as unknown as typeof window.matchMedia;
}

describe("FocusCard — Keep/Skip", () => {
  beforeEach(() => {
    triagePersonMock.mockReset();
    triagePersonMock.mockResolvedValue({});
    mockLayout("phone");
  });

  afterEach(() => {
    window.matchMedia = realMatchMedia;
  });

  it("renders the first person when the queue is non-empty", () => {
    const people = [person({ id: "p-1", first_name: "Alex" }), person({ id: "p-2", first_name: "Bo" })];
    render(<FollowUpFocus people={people} />);
    expect(screen.getByText(/alex rivera/i)).toBeInTheDocument();
    expect(screen.queryByText(/bo rivera/i)).not.toBeInTheDocument();
  });

  it("Skip calls triage skipped and advances", async () => {
    const people = [person({ id: "p-1", first_name: "Alex" }), person({ id: "p-2", first_name: "Bo" })];
    render(<FollowUpFocus people={people} />);

    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));

    await waitFor(() => expect(triagePersonMock).toHaveBeenCalledWith("p-1", "skipped", "test-token"));
    await waitFor(() => expect(screen.getByText(/bo rivera/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText(/alex rivera/i)).not.toBeInTheDocument());
  });

  it("Keep calls triage kept and advances", async () => {
    const people = [person({ id: "p-1", first_name: "Alex" }), person({ id: "p-2", first_name: "Bo" })];
    render(<FollowUpFocus people={people} />);

    fireEvent.click(screen.getByRole("button", { name: /^keep$/i }));

    await waitFor(() => expect(triagePersonMock).toHaveBeenCalledWith("p-1", "kept", "test-token"));
    await waitFor(() => expect(screen.getByText(/bo rivera/i)).toBeInTheDocument());
  });

  it("shows an inline error and does not advance when triage fails", async () => {
    triagePersonMock.mockRejectedValueOnce(new Error("boom"));
    const people = [person({ id: "p-1" }), person({ id: "p-2", first_name: "Bo" })];
    render(<FollowUpFocus people={people} />);

    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/alex rivera/i)).toBeInTheDocument();
  });

  it("shows the room-reviewed end state when the queue empties", async () => {
    const people = [person({ id: "p-1" })];
    render(<FollowUpFocus people={people} />);

    fireEvent.click(screen.getByRole("button", { name: /^keep$/i }));

    expect(await screen.findByText(/room reviewed/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open inbox/i })).toHaveAttribute("href", "/inbox");
  });

  it("shows previous/next browse controls on phone and wraps the queue", () => {
    const people = [person({ id: "p-1", first_name: "Alex" }), person({ id: "p-2", first_name: "Bo" })];
    render(<FollowUpFocus people={people} />);
    expect(screen.getByRole("button", { name: /previous person/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /next person/i })).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /next person/i }));
    expect(screen.getByText(/bo rivera/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /next person/i }));
    expect(screen.getByText(/alex rivera/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /previous person/i }));
    expect(screen.getByText(/bo rivera/i)).toBeInTheDocument();
    expect(screen.queryByText(/swipe right/i)).not.toBeInTheDocument();
  });

  it("expands the profile dossier on phone", () => {
    const people = [
      person({
        id: "p-1",
        first_name: "Alex",
        why: "Backs early infra bets across the bay",
        event_title: "Build Fridays",
      }),
    ];
    render(<FollowUpFocus people={people} />);
    fireEvent.click(screen.getByRole("button", { name: /expand profile/i }));
    expect(screen.getByText(/backs early infra bets across the bay/i)).toBeInTheDocument();
    expect(screen.getByText(/why meet/i)).toBeInTheDocument();
    expect(screen.getByText(/recent work/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /collapse profile/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: /collapse profile/i }));
    expect(screen.getByRole("button", { name: /expand profile/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("expands the dossier when the phone stage scrolls down", () => {
    const people = [
      person({
        id: "p-1",
        first_name: "Alex",
        why: "Backs early infra bets across the bay",
        event_title: "Build Fridays",
      }),
    ];
    const { container } = render(<FollowUpFocus people={people} />);
    const stage = container.querySelector(".grid.h-full");
    expect(stage).toBeTruthy();
    fireEvent.wheel(stage!, { deltaY: 40 });
    expect(screen.getByRole("button", { name: /collapse profile/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText(/backs early infra bets across the bay/i)).toBeInTheDocument();
  });

  it("shows LinkedIn and X when URLs exist", () => {
    const people = [
      person({
        id: "p-1",
        first_name: "Alex",
        linkedin_url: "https://www.linkedin.com/in/alex",
        x_url: "https://x.com/alex",
      }),
    ];
    render(<FollowUpFocus people={people} />);
    const linkedin = screen.getByRole("link", { name: /alex rivera on linkedin/i });
    const x = screen.getByRole("link", { name: /alex rivera on x/i });
    expect(linkedin).toHaveAttribute("href", "https://www.linkedin.com/in/alex");
    expect(x).toHaveAttribute("href", "https://x.com/alex");
    expect(linkedin).toHaveTextContent("LinkedIn");
    expect(x).toHaveTextContent("X");
    expect(linkedin.className).toMatch(/min-h-11/);
    expect(x.className).toMatch(/min-h-11/);
    // Parent stack raises socials above browse hit zones.
    expect(linkedin.parentElement?.className).toMatch(/z-20/);
    expect(linkedin.parentElement?.className).toMatch(/pointer-events-auto/);
  });

  it("hides LinkedIn and X when URLs are missing", () => {
    render(<FollowUpFocus people={[person({ id: "p-1" })]} />);
    expect(screen.queryByRole("link", { name: /linkedin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: / on x$/i })).not.toBeInTheDocument();
  });
});

describe("FocusCard — filmstrip", () => {
  beforeEach(() => {
    triagePersonMock.mockReset();
    triagePersonMock.mockResolvedValue({});
    mockLayout("workbench");
  });

  afterEach(() => {
    window.matchMedia = realMatchMedia;
  });

  it("shows the queue filmstrip on desktop without instructional copy", async () => {
    const people = [person({ id: "p-1", first_name: "Alex" }), person({ id: "p-2", first_name: "Bo" })];
    render(<FollowUpFocus people={people} />);
    expect(await screen.findByRole("region", { name: /queue/i })).toBeInTheDocument();
    expect(screen.queryByText(/browse/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bo rivera/i })).toBeInTheDocument();
  });
});
