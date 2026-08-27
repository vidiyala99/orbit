import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ChatsPage from "../page";
import { ThreadSummaryT, UserT } from "@/lib/types";

const cookieValue = vi.fn<() => string | undefined>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "sc_token" ? { value: cookieValue() } : undefined),
  }),
}));

const fetchMyThreads = vi.fn();
vi.mock("@/lib/api", () => ({
  fetchMyThreads: (...args: unknown[]) => fetchMyThreads(...args),
}));

const requireOnboarded = vi.fn();
vi.mock("@/lib/requireOnboarded", () => ({ requireOnboarded: () => requireOnboarded() }));

const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
  usePathname: () => "/chats",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const NOW = new Date("2026-08-22T12:00:00Z");

function makeUser(over: Partial<UserT> = {}): UserT {
  return {
    id: "me",
    email: "a@b.com",
    email_verified_at: null,
    headline: null,
    linkedin_url: null,
    avatar_url: null,
    first_name: "Maya",
    last_name: "Rao",
    city: "Austin, TX",
    lat: 30.2672,
    lon: -97.7431,
    pain_points: null,
    pain_point_other: null,
    onboarded_at: "2026-08-01T00:00:00Z",
    google_calendar_connected: false,
    ...over,
  };
}

function makeThread(over: Partial<ThreadSummaryT> = {}): ThreadSummaryT {
  return {
    id: "t1",
    other_user: { id: "u9", first_name: "Dev", last_name: "Patel", avatar_url: null },
    last_message: {
      id: "m1",
      sender_id: "u9",
      body: "Still on for coffee at 4?",
      created_at: "2026-08-22T11:30:00Z",
    },
    ...over,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  cookieValue.mockReset();
  fetchMyThreads.mockReset();
  requireOnboarded.mockReset();
  redirect.mockClear();
  cookieValue.mockReturnValue("tok");
  fetchMyThreads.mockResolvedValue([]);
  requireOnboarded.mockResolvedValue(makeUser());
});

afterEach(() => {
  vi.useRealTimers();
});

async function renderPage() {
  render(await ChatsPage());
}

describe("ChatsPage access", () => {
  it("redirects anonymous visitors to sign in", async () => {
    cookieValue.mockReturnValue(undefined);
    await expect(ChatsPage()).rejects.toThrow("REDIRECT:/sign-in");
    expect(fetchMyThreads).not.toHaveBeenCalled();
  });

  it("fetches the signed-in user's threads with their token", async () => {
    await renderPage();
    expect(fetchMyThreads).toHaveBeenCalledWith("tok");
  });
});

describe("ChatsPage empty state", () => {
  it("invites the user to start a conversation", async () => {
    await renderPage();
    expect(screen.getByText(/no conversations yet/i)).toBeInTheDocument();
    expect(screen.getByText(/message someone from a plan or room/i)).toBeInTheDocument();
  });
});

describe("ChatsPage list", () => {
  it("renders a row per thread linking to the conversation", async () => {
    fetchMyThreads.mockResolvedValue([
      makeThread(),
      makeThread({
        id: "t2",
        other_user: { id: "u4", first_name: "Sam", last_name: "Cole", avatar_url: null },
        last_message: {
          id: "m2",
          sender_id: "me",
          body: "Nice meeting you!",
          created_at: "2026-08-20T12:00:00Z",
        },
      }),
    ]);
    await renderPage();

    const links = screen.getAllByRole("link", { name: /dev patel|sam cole/i });
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/chats/t1", "/chats/t2"]);
    expect(screen.queryByText(/no conversations yet/i)).not.toBeInTheDocument();
  });

  it("shows the latest message as a one-line preview", async () => {
    fetchMyThreads.mockResolvedValue([makeThread()]);
    await renderPage();

    const preview = screen.getByText("Still on for coffee at 4?");
    expect(preview).toBeInTheDocument();
    expect(preview.className).toContain("truncate");
  });

  it("marks the user's own last message with a You prefix", async () => {
    fetchMyThreads.mockResolvedValue([
      makeThread({
        last_message: {
          id: "m2",
          sender_id: "me",
          body: "Nice meeting you!",
          created_at: "2026-08-22T11:00:00Z",
        },
      }),
    ]);
    await renderPage();
    expect(screen.getByText(/^You: Nice meeting you!$/)).toBeInTheDocument();
  });

  it("handles a thread with no messages yet", async () => {
    fetchMyThreads.mockResolvedValue([makeThread({ last_message: null })]);
    await renderPage();
    expect(screen.getByText("Dev Patel")).toBeInTheDocument();
    expect(screen.getByText(/say hi/i)).toBeInTheDocument();
  });

  it("falls back to a placeholder when the other person has no name", async () => {
    fetchMyThreads.mockResolvedValue([
      makeThread({ other_user: { id: "u9", first_name: null, last_name: null, avatar_url: null } }),
    ]);
    await renderPage();
    expect(screen.getByText("Someone")).toBeInTheDocument();
  });

  it("shows a relative timestamp for the latest message", async () => {
    fetchMyThreads.mockResolvedValue([
      makeThread({ id: "a", last_message: { ...makeThread().last_message!, id: "x", created_at: "2026-08-22T11:59:30Z" } }),
      makeThread({ id: "b", last_message: { ...makeThread().last_message!, id: "y", created_at: "2026-08-22T11:30:00Z" } }),
      makeThread({ id: "c", last_message: { ...makeThread().last_message!, id: "z", created_at: "2026-08-22T09:00:00Z" } }),
      makeThread({ id: "d", last_message: { ...makeThread().last_message!, id: "w", created_at: "2026-08-20T12:00:00Z" } }),
    ]);
    await renderPage();
    expect(screen.getByText("now")).toBeInTheDocument();
    expect(screen.getByText("30m")).toBeInTheDocument();
    expect(screen.getByText("3h")).toBeInTheDocument();
    expect(screen.getByText("2d")).toBeInTheDocument();
  });
});

describe("ChatsPage chrome", () => {
  it("renders both nav shells with Chats current", async () => {
    await renderPage();
    for (const label of [/sections/i, /main/i]) {
      const nav = within(screen.getByRole("navigation", { name: label }));
      expect(nav.getByRole("link", { name: /chats/i })).toHaveAttribute("aria-current", "page");
    }
  });
});
