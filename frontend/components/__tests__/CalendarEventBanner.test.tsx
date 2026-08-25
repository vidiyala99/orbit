import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CalendarEventBanner from "../CalendarEventBanner";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const fetchEventCandidates = vi.fn();
vi.mock("@/lib/api", () => ({
  fetchEventCandidates: (...args: unknown[]) => fetchEventCandidates(...args),
  calendarConnectUrl: (token: string) => `http://api.test/me/calendar/connect?token=${token}`,
}));

const calendarCandidate = {
  source: "calendar" as const,
  title: "AI Infrastructure Night",
  location: "625 2nd St, SF",
  starts_at: "2026-08-24T17:00:00.000Z",
  ends_at: "2026-08-24T19:00:00.000Z",
};

const gmailCandidate = {
  source: "gmail" as const,
  title: "You're going to Founders Coffee Meetup",
  location: null,
  starts_at: null,
  ends_at: null,
};

const idOf = (c: { source: string; title: string; starts_at: string | null }) =>
  `${c.source}-${c.title}-${c.starts_at ?? ""}`;

function setLocationStub() {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { href: "" },
  });
}

beforeEach(() => {
  push.mockReset();
  fetchEventCandidates.mockReset();
  fetchEventCandidates.mockResolvedValue({ connected: true, candidates: [] });
  sessionStorage.clear();
  setLocationStub();
});

describe("CalendarEventBanner — not connected", () => {
  it("renders the connect ribbon", () => {
    render(<CalendarEventBanner token="tok" googleCalendarConnected={false} />);
    expect(screen.getByText(/connect google calendar/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^connect$/i })).toBeInTheDocument();
    expect(fetchEventCandidates).not.toHaveBeenCalled();
  });

  it("navigates to the connect URL when Connect is clicked", () => {
    render(<CalendarEventBanner token="tok" googleCalendarConnected={false} />);
    fireEvent.click(screen.getByRole("button", { name: /^connect$/i }));
    expect(window.location.href).toBe("http://api.test/me/calendar/connect?token=tok");
  });

  it("hides for the session when dismissed", () => {
    render(<CalendarEventBanner token="tok" googleCalendarConnected={false} />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByText(/connect google calendar/i)).not.toBeInTheDocument();
    expect(sessionStorage.getItem("sc_calendar_ribbon_dismissed")).toBe("1");
  });

  it("renders nothing when already dismissed this session", () => {
    sessionStorage.setItem("sc_calendar_ribbon_dismissed", "1");
    render(<CalendarEventBanner token="tok" googleCalendarConnected={false} />);
    expect(screen.queryByText(/connect google calendar/i)).not.toBeInTheDocument();
  });
});

describe("CalendarEventBanner — connected", () => {
  it("renders one row per candidate under a 'Pick one to pin' headline", async () => {
    fetchEventCandidates.mockResolvedValue({
      connected: true,
      candidates: [calendarCandidate, gmailCandidate],
    });
    render(<CalendarEventBanner token="tok" googleCalendarConnected />);

    expect(await screen.findByText("Pick one to pin")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /pin this/i })).toHaveLength(2);
    expect(screen.getByText("AI Infrastructure Night")).toBeInTheDocument();
    expect(screen.getByText(gmailCandidate.title)).toBeInTheDocument();
    expect(screen.getByText("Calendar")).toBeInTheDocument();
    expect(screen.getByText("Inbox")).toBeInTheDocument();
  });

  it("shows a time range and location for a calendar row but not a gmail row", async () => {
    fetchEventCandidates.mockResolvedValue({
      connected: true,
      candidates: [calendarCandidate, gmailCandidate],
    });
    render(<CalendarEventBanner token="tok" googleCalendarConnected />);

    await screen.findByText("Pick one to pin");
    expect(screen.getByText(/625 2nd St, SF/)).toBeInTheDocument();

    const gmailRow = screen.getByText(gmailCandidate.title).closest("div");
    expect(gmailRow?.textContent).toBe(`${gmailCandidate.title}Inbox`);
  });

  it("collapses a single candidate to its own title as the headline", async () => {
    fetchEventCandidates.mockResolvedValue({ connected: true, candidates: [calendarCandidate] });
    render(<CalendarEventBanner token="tok" googleCalendarConnected />);

    expect(await screen.findByText("AI Infrastructure Night")).toBeInTheDocument();
    expect(screen.queryByText("Pick one to pin")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /pin this/i })).toHaveLength(1);
    expect(screen.getByRole("button", { name: /not going/i })).toBeInTheDocument();
  });

  it("asks the API for today's local day boundaries", async () => {
    fetchEventCandidates.mockResolvedValue({ connected: true, candidates: [calendarCandidate] });
    render(<CalendarEventBanner token="tok" googleCalendarConnected />);
    await waitFor(() => expect(fetchEventCandidates).toHaveBeenCalled());

    const [dayStart, dayEnd, token] = fetchEventCandidates.mock.calls[0];
    expect(token).toBe("tok");
    expect(new Date(dayStart).getHours()).toBe(0);
    expect(new Date(dayEnd).getHours()).toBe(23);
    expect(new Date(dayEnd).getTime()).toBeGreaterThan(new Date(dayStart).getTime());
  });

  it("renders nothing when there are no candidates", async () => {
    fetchEventCandidates.mockResolvedValue({ connected: true, candidates: [] });
    render(<CalendarEventBanner token="tok" googleCalendarConnected />);
    await waitFor(() => expect(fetchEventCandidates).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /pin this/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/connect google calendar/i)).not.toBeInTheDocument();
  });

  it("renders nothing when the fetch fails", async () => {
    fetchEventCandidates.mockRejectedValue(new Error("boom"));
    render(<CalendarEventBanner token="tok" googleCalendarConnected />);
    await waitFor(() => expect(fetchEventCandidates).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /pin this/i })).not.toBeInTheDocument();
  });

  it("filters out candidates already skipped this session", async () => {
    sessionStorage.setItem("sc_calendar_skipped", JSON.stringify([idOf(calendarCandidate)]));
    fetchEventCandidates.mockResolvedValue({
      connected: true,
      candidates: [calendarCandidate, gmailCandidate],
    });
    render(<CalendarEventBanner token="tok" googleCalendarConnected />);

    expect(await screen.findByText(gmailCandidate.title)).toBeInTheDocument();
    expect(screen.queryByText("AI Infrastructure Night")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /pin this/i })).toHaveLength(1);
  });

  it("renders nothing when every candidate was skipped this session", async () => {
    sessionStorage.setItem(
      "sc_calendar_skipped",
      JSON.stringify([idOf(calendarCandidate), idOf(gmailCandidate)]),
    );
    fetchEventCandidates.mockResolvedValue({
      connected: true,
      candidates: [calendarCandidate, gmailCandidate],
    });
    render(<CalendarEventBanner token="tok" googleCalendarConnected />);

    await waitFor(() => expect(fetchEventCandidates).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /pin this/i })).not.toBeInTheDocument();
  });

  it("skips every shown candidate at once from the card-level dismiss", async () => {
    fetchEventCandidates.mockResolvedValue({
      connected: true,
      candidates: [calendarCandidate, gmailCandidate],
    });
    render(<CalendarEventBanner token="tok" googleCalendarConnected />);

    fireEvent.click(await screen.findByRole("button", { name: /dismiss for today/i }));

    expect(screen.queryByRole("button", { name: /pin this/i })).not.toBeInTheDocument();
    const skipped = JSON.parse(sessionStorage.getItem("sc_calendar_skipped") ?? "[]");
    expect(skipped).toEqual([idOf(calendarCandidate), idOf(gmailCandidate)]);
  });

  it("stores the picked candidate as the prefill payload and routes to /post", async () => {
    fetchEventCandidates.mockResolvedValue({
      connected: true,
      candidates: [calendarCandidate, gmailCandidate],
    });
    render(<CalendarEventBanner token="tok" googleCalendarConnected />);

    const buttons = await screen.findAllByRole("button", { name: /pin this/i });
    fireEvent.click(buttons[1]);

    expect(JSON.parse(sessionStorage.getItem("sc_calendar_prefill") ?? "null")).toEqual(
      gmailCandidate,
    );
    expect(push).toHaveBeenCalledWith("/post");
  });
});
