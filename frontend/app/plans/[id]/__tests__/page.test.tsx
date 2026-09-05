import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PlanDetailPage from "../page";
import { PlanT } from "@/lib/types";

const cookieValue = vi.fn<() => string | undefined>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "sc_token" ? { value: cookieValue() } : undefined),
  }),
}));

const fetchPlan = vi.fn();
const fetchMe = vi.fn();
vi.mock("@/lib/api", () => ({
  fetchPlan: (...args: unknown[]) => fetchPlan(...args),
  fetchMe: (...args: unknown[]) => fetchMe(...args),
  startThread: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/plans/p1",
}));

const plan: PlanT = {
  id: "p1",
  user_id: "u2",
  activity: "coffee",
  openness: "open_to_chat",
  detail: null,
  text: "Coffee chat",
  lat: 30.26,
  lon: -97.74,
  starts_at: new Date(Date.now() - 60000).toISOString(),
  ends_at: new Date(Date.now() + 3600000).toISOString(),
};

beforeEach(() => {
  cookieValue.mockReset();
  fetchPlan.mockReset();
  fetchMe.mockReset();
  cookieValue.mockReturnValue("tok");
  fetchPlan.mockResolvedValue(plan);
  fetchMe.mockResolvedValue({ id: "u1" });
});

async function renderPage() {
  render(await PlanDetailPage({ params: Promise.resolve({ id: "p1" }) }));
}

describe("PlanDetailPage section navs", () => {
  it("shows the four sections in both nav shells", async () => {
    await renderPage();
    for (const label of [/sections/i, /main/i]) {
      const nav = within(screen.getByRole("navigation", { name: label }));
      expect(nav.getByRole("link", { name: /wall/i })).toHaveAttribute("href", "/today");
      expect(nav.getByRole("link", { name: /^map$/i })).toHaveAttribute("href", "/map");
      expect(nav.getByRole("link", { name: /^rooms$/i })).toHaveAttribute("href", "/rooms");
      expect(nav.getByRole("link", { name: /^chats$/i })).toHaveAttribute("href", "/chats");
    }
  });

  it("still renders the plan itself and visible event research", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { name: "Coffee chat" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /research this event/i })).toBeInTheDocument();
  });
});

describe("PlanDetailPage messaging affordance", () => {
  it("shows a Message button when viewing someone else's plan", async () => {
    await renderPage();
    expect(screen.getByRole("button", { name: "Message" })).toBeInTheDocument();
  });

  it("hides the Message button and explains why on your own plan", async () => {
    fetchMe.mockResolvedValue({ id: "u2" }); // plan.user_id is "u2"
    await renderPage();
    expect(screen.queryByRole("button", { name: "Message" })).not.toBeInTheDocument();
    expect(screen.getByText("This is your plan")).toBeInTheDocument();
  });

  it("prompts sign-in instead of a Message button when signed out", async () => {
    cookieValue.mockReturnValue(undefined);
    await renderPage();
    expect(fetchMe).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Message" })).not.toBeInTheDocument();
    expect(screen.getByText("Sign in to message the poster")).toBeInTheDocument();
  });
});
