import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "../api";
import { FIXTURE_ATTENDEES, FIXTURE_EVENT } from "../demoFixtures";

const demoLogin = vi.fn();
const fetchEventGuests = vi.fn();
const syncFixturePeople = vi.fn();
const getClientToken = vi.fn();
const setClientToken = vi.fn();

vi.mock("../api", async () => {
  const actual = await vi.importActual<typeof import("../api")>("../api");
  return {
    ...actual,
    demoLogin: (...args: unknown[]) => demoLogin(...args),
    fetchEventGuests: (...args: unknown[]) => fetchEventGuests(...args),
    syncFixturePeople: (...args: unknown[]) => syncFixturePeople(...args),
  };
});

vi.mock("../auth", () => ({
  getClientToken: () => getClientToken(),
  setClientToken: (token: string) => setClientToken(token),
}));

import {
  DEMO_EVENT_ID,
  LIVE_EVENT,
  findDeskAttendee,
  guestsFromResponse,
  loadDeskGuests,
  mapGuestToAttendee,
} from "../guests";

const ALEX = {
  id: "68d0e97d-4bfe-4142-996d-7ea1db58ed08",
  name: "Alex Rivera",
  role: "Partner, Westbound Ventures",
  avatar_url: null,
  linkedin_url: "https://www.linkedin.com/in/alex-rivera-westbound",
  x_url: "https://x.com/alexrivera",
  email: "alex@westbound.example",
  where_met: "Burning Token Friday mixer, coat-check line",
  what_talked: "Fund III seed checks for personal CRM / comms tools; clipboard drafts vs auto-DM",
  relevance: "Writing seed checks for clipboard-first personal CRM - wants warm intros in the room",
  note: "Met Alex Rivera (Partner, Westbound) in the coat-check line.",
  dm: "Alex - great running into you at the Burning Token mixer.",
  note_payload: "Met Alex Rivera (Partner, Westbound) in the coat-check line.",
  dm_payload: "Alex - great running into you at the Burning Token mixer.",
  event_id: "burning-token",
  priority: "needs_you",
  linkedin_connected: true,
  x_interacted: true,
};

const SAM = {
  id: "88eb4b11-77f8-4b08-b755-cac7ba517f09",
  name: "Sam Okonkwo",
  role: "Founder, Guestline",
  linkedin_url: null,
  x_url: "https://x.com/samokonkwo",
  where_met: "Saturday workshop, table 4",
  what_talked: "Luma-style guest lists that stay fixtures-first",
  relevance: "Shipping the same guest-list + clipboard-draft surface",
  note_payload: "Sat next to Sam Okonkwo at Saturday workshop table 4.",
  dm_payload: "Sam - still thinking about your fixtures-first guest list.",
  priority: "high",
  linkedin_connected: false,
  x_interacted: true,
};

const RILEY = {
  id: "e2e03a41-0885-49e9-8092-938d3bdf85bb",
  name: "Riley Park",
  role: "Recruiter, token-factory infra",
  linkedin_url: "https://www.linkedin.com/in/riley-park",
  x_url: null,
  where_met: "Sunday coffee line",
  what_talked: "Hiring a PM who has run event guest lists",
  relevance: "Hiring a guest-list PM and can spare Token Factory credits",
  note_payload: "Riley Park in the Sunday coffee line.",
  dm_payload: "Riley - thanks for accepting the follow-up.",
  priority: "later",
  linkedin_connected: true,
  x_interacted: false,
};

beforeEach(() => {
  demoLogin.mockReset();
  fetchEventGuests.mockReset();
  syncFixturePeople.mockReset();
  getClientToken.mockReset();
  setClientToken.mockReset();
  getClientToken.mockReturnValue(null);
});

describe("mapGuestToAttendee", () => {
  it("maps the live Engine Person shape onto the desk AttendeeT", () => {
    const alex = mapGuestToAttendee(ALEX)!;
    expect(alex.first_name).toBe("Alex");
    expect(alex.last_name).toBe("Rivera");
    expect(alex.role).toBe("Partner, Westbound Ventures");
    expect(alex.priority).toBe("needs_you");
    expect(alex.linkedin_connected).toBe(true);
    expect(alex.x_interacted).toBe(true);
    expect(alex.linkedin_url).toMatch(/linkedin/);
    expect(alex.x_url).toMatch(/x\.com/);
    expect(alex.why_meet).toMatch(/clipboard-first personal CRM/);
    expect(alex.note.where_met).toMatch(/coat-check/);
    expect(alex.note.what_talked).toMatch(/Fund III/);
    expect(alex.note.why).toMatch(/warm intros/);
    expect(alex.note_payload).toBe(ALEX.note_payload);
    expect(alex.dm_payload).toBe(ALEX.dm_payload);

    const sam = mapGuestToAttendee(SAM)!;
    expect(sam.priority).toBe("high");
    expect(sam.linkedin_connected).toBe(false);
    expect(sam.x_interacted).toBe(true);
    expect(sam.linkedin_url).toBe("");

    const riley = mapGuestToAttendee(RILEY)!;
    expect(riley.priority).toBe("later");
    expect(riley.linkedin_connected).toBe(true);
    expect(riley.x_interacted).toBe(false);
    expect(riley.x_url).toBe("");
  });

  it("accepts wrapped payloads and first_name aliases", () => {
    const rows = guestsFromResponse({
      guests: [{ id: "ada-1", first_name: "Ada", last_name: "Lovelace", priority: "high" }],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].first_name).toBe("Ada");
    expect(rows[0].last_name).toBe("Lovelace");
    expect(rows[0].priority).toBe("high");
  });

  it("drops rows that have no id or name", () => {
    expect(mapGuestToAttendee({ name: "No Id" })).toBeNull();
    expect(mapGuestToAttendee({ id: "x" })).toBeNull();
    expect(guestsFromResponse("nope")).toEqual([]);
  });
});

describe("loadDeskGuests", () => {
  it("demo-logs in, fetches live guests, and does not use local fixture names", async () => {
    demoLogin.mockResolvedValue({ access_token: "tok", user: { id: "demo" } });
    fetchEventGuests.mockResolvedValue([ALEX, SAM, RILEY]);

    const desk = await loadDeskGuests();

    expect(demoLogin).toHaveBeenCalledTimes(1);
    expect(setClientToken).toHaveBeenCalledWith("tok");
    expect(fetchEventGuests).toHaveBeenCalledWith(DEMO_EVENT_ID, "tok");
    expect(syncFixturePeople).not.toHaveBeenCalled();
    expect(desk.source).toBe("live");
    expect(desk.event).toEqual(LIVE_EVENT);
    expect(desk.attendees.map((row) => `${row.first_name} ${row.last_name}`)).toEqual([
      "Alex Rivera",
      "Sam Okonkwo",
      "Riley Park",
    ]);
    expect(desk.attendees.some((row) => row.last_name === "Chen")).toBe(false);
  });

  it("reuses an existing bearer and seeds fixtures when the guest list is empty", async () => {
    getClientToken.mockReturnValue("existing");
    fetchEventGuests
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([ALEX, SAM, RILEY]);
    syncFixturePeople.mockResolvedValue(undefined);

    const desk = await loadDeskGuests();

    expect(demoLogin).not.toHaveBeenCalled();
    expect(syncFixturePeople).toHaveBeenCalledWith("existing");
    expect(fetchEventGuests).toHaveBeenCalledTimes(2);
    expect(desk.source).toBe("live");
    expect(desk.attendees[0].first_name).toBe("Alex");
  });

  it("falls back to local fixtures when the API is unreachable", async () => {
    demoLogin.mockRejectedValue(new Error("Demo login timed out. Opening the local demo."));

    const desk = await loadDeskGuests();

    expect(desk.source).toBe("fallback");
    expect(desk.event).toEqual(FIXTURE_EVENT);
    expect(desk.attendees).toBe(FIXTURE_ATTENDEES);
    expect(fetchEventGuests).not.toHaveBeenCalled();
  });

  it("retries demo-login once after a stale 401, then falls back", async () => {
    getClientToken.mockReturnValue("stale");
    demoLogin.mockResolvedValue({ access_token: "fresh", user: { id: "demo" } });
    fetchEventGuests
      .mockRejectedValueOnce(new ApiRequestError("fetchEventGuests failed: 401", 401))
      .mockResolvedValueOnce([ALEX]);

    const desk = await loadDeskGuests();

    expect(demoLogin).toHaveBeenCalledTimes(1);
    expect(setClientToken).toHaveBeenCalledWith("fresh");
    expect(desk.source).toBe("live");
    expect(desk.attendees[0].last_name).toBe("Rivera");
  });

  it("finds a live guest by id and still resolves fixture slugs", () => {
    const live = mapGuestToAttendee(ALEX)!;
    expect(findDeskAttendee(live.id, [live])?.first_name).toBe("Alex");
    expect(findDeskAttendee("marcus-ellis", [live])?.last_name).toBe("Ellis");
    expect(findDeskAttendee("missing", [live])).toBeUndefined();
  });
});
