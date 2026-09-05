import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PostPlanPage from "../page";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  usePathname: () => "/post",
}));

const createPlan = vi.fn();
vi.mock("@/lib/api", () => ({ createPlan: (...args: unknown[]) => createPlan(...args) }));
vi.mock("@/lib/auth", () => ({ getClientToken: () => "tok", clearClientToken: vi.fn() }));

function mockGeolocation() {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: (ok: (p: unknown) => void) =>
        ok({ coords: { latitude: 37.44, longitude: -122.14 } }),
    },
  });
}

const preview = () => screen.getByTestId("plan-preview").textContent;

beforeEach(() => {
  push.mockReset();
  createPlan.mockReset();
  createPlan.mockResolvedValue({ id: "p1" });
  mockGeolocation();
  sessionStorage.clear();
});

describe("PostPlanPage composer", () => {
  it("links back to /map", () => {
    render(<PostPlanPage />);
    expect(screen.getByRole("link", { name: /← map/i })).toHaveAttribute("href", "/map");
  });

  it("assembles the preview sentence from activity, openness and duration", async () => {
    render(<PostPlanPage />);

    fireEvent.click(screen.getByRole("button", { name: "Coffee" }));
    fireEvent.click(screen.getByRole("button", { name: "Open to chat" }));
    fireEvent.click(screen.getByRole("button", { name: "2 hours" }));
    expect(preview()).toBe("Grabbing coffee, open to chat — around for the next 2 hours.");

    fireEvent.click(screen.getByRole("button", { name: "Ride share" }));
    fireEvent.click(screen.getByRole("button", { name: "Actively looking to meet people" }));
    fireEvent.click(screen.getByRole("button", { name: "30 min" }));
    expect(preview()).toBe(
      "Heading out, ride share, actively looking to meet people — around for the next 30 minutes.",
    );

    fireEvent.click(screen.getByRole("button", { name: "1 hour" }));
    expect(preview()).toContain("the next 1 hour.");
  });

  it("appends the detail to the preview once typed", async () => {
    render(<PostPlanPage />);

    fireEvent.click(screen.getByRole("button", { name: "Meal" }));
    fireEvent.click(screen.getByRole("button", { name: "Heads down, say hi anyway" }));
    fireEvent.click(screen.getByRole("button", { name: "4 hours" }));
    fireEvent.click(screen.getByRole("button", { name: /add a detail/i }));
    fireEvent.change(screen.getByLabelText(/detail/i), { target: { value: "By the window." } });

    expect(preview()).toBe(
      "Grabbing food, heads down, but say hi — around for the next 4 hours. By the window.",
    );
  });

  it("reveals and hides the detail textarea behind a toggle", async () => {
    render(<PostPlanPage />);

    expect(screen.queryByLabelText(/detail/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /add a detail/i }));
    expect(screen.getByLabelText(/detail/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /add a detail/i }));
    expect(screen.queryByLabelText(/detail/i)).not.toBeInTheDocument();
  });

  it("disables submit until both activity and openness are chosen", async () => {
    render(<PostPlanPage />);

    const submit = screen.getByRole("button", { name: /pin it/i });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Cowork" }));
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Open to chat" }));
    expect(submit).toBeEnabled();
  });

  it("submits a structured body and routes to the new plan", async () => {
    render(<PostPlanPage />);

    fireEvent.click(screen.getByRole("button", { name: "Cowork" }));
    fireEvent.click(screen.getByRole("button", { name: "Open to chat" }));
    fireEvent.click(screen.getByRole("button", { name: "1 hour" }));
    fireEvent.click(screen.getByRole("button", { name: /add a detail/i }));
    fireEvent.change(screen.getByLabelText(/detail/i), { target: { value: "Blue laptop." } });
    fireEvent.click(screen.getByRole("button", { name: /pin it/i }));

    await waitFor(() => expect(createPlan).toHaveBeenCalled());
    const [body, token] = createPlan.mock.calls[0];
    expect(token).toBe("tok");
    expect(body).toMatchObject({
      activity: "cowork",
      openness: "open_to_chat",
      detail: "Blue laptop.",
      lat: 37.44,
      lon: -122.14,
    });
    expect(
      new Date(body.ends_at).getTime() - new Date(body.starts_at).getTime(),
    ).toBe(3600000);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/plans/p1"));
  });

  it("sends a null detail when none was added", async () => {
    render(<PostPlanPage />);

    fireEvent.click(screen.getByRole("button", { name: "Something else" }));
    fireEvent.click(screen.getByRole("button", { name: "Open to chat" }));
    fireEvent.click(screen.getByRole("button", { name: /pin it/i }));

    await waitFor(() => expect(createPlan).toHaveBeenCalled());
    expect(createPlan.mock.calls[0][0]).toMatchObject({ activity: "other", detail: null });
  });

  it("offers an Event activity alongside the existing five", () => {
    render(<PostPlanPage />);
    expect(screen.getByRole("button", { name: "Event" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Something else" })).toBeInTheDocument();
  });

  it("shows the error message when createPlan fails", async () => {
    createPlan.mockRejectedValue(new Error("createPlan failed: 422"));
    render(<PostPlanPage />);

    fireEvent.click(screen.getByRole("button", { name: "Coffee" }));
    fireEvent.click(screen.getByRole("button", { name: "Open to chat" }));
    fireEvent.click(screen.getByRole("button", { name: /pin it/i }));

    expect(await screen.findByText("createPlan failed: 422")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});

describe("PostPlanPage section navs", () => {
  it("shows the four sections in both nav shells", () => {
    render(<PostPlanPage />);
    for (const label of [/sections/i, /main/i]) {
      const nav = within(screen.getByRole("navigation", { name: label }));
      expect(nav.getByRole("link", { name: /wall/i })).toHaveAttribute("href", "/today");
      expect(nav.getByRole("link", { name: /^map$/i })).toHaveAttribute("href", "/map");
      expect(nav.getByRole("link", { name: /^rooms$/i })).toHaveAttribute("href", "/rooms");
      expect(nav.getByRole("link", { name: /^chats$/i })).toHaveAttribute("href", "/chats");
    }
  });
});

function storePrefill(over: Record<string, unknown> = {}) {
  const start = new Date();
  start.setHours(10, 0, 0, 0);
  const end = new Date(start.getTime() + 120 * 60000);
  sessionStorage.setItem(
    "sc_calendar_prefill",
    JSON.stringify({
      source: "calendar",
      title: "Founders Coffee",
      location: "Blue Bottle",
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      ...over,
    }),
  );
}

describe("PostPlanPage calendar prefill", () => {
  it("fills activity, openness, duration and detail from sessionStorage", () => {
    storePrefill();
    render(<PostPlanPage />);

    expect(screen.getByRole("button", { name: "Event" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Open to chat" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "2 hours" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText(/detail/i)).toHaveValue("Founders Coffee @ Blue Bottle");
    expect(preview()).toContain("Heading to an event, open to chat");
    expect(preview()).toContain("Founders Coffee @ Blue Bottle");
  });

  it("omits the location from the detail when the event has none", () => {
    storePrefill({ location: null });
    render(<PostPlanPage />);
    expect(screen.getByLabelText(/detail/i)).toHaveValue("Founders Coffee");
  });

  it("snaps the duration to the closest bucket", () => {
    const start = new Date();
    start.setHours(10, 0, 0, 0);
    storePrefill({
      starts_at: start.toISOString(),
      ends_at: new Date(start.getTime() + 45 * 60000).toISOString(),
    });
    render(<PostPlanPage />);
    expect(screen.getByRole("button", { name: "30 min" })).toHaveAttribute("aria-pressed", "true");
  });

  it("consumes the sessionStorage key so a later plain visit is unaffected", () => {
    storePrefill();
    const first = render(<PostPlanPage />);
    expect(sessionStorage.getItem("sc_calendar_prefill")).toBeNull();

    first.unmount();
    render(<PostPlanPage />);
    expect(screen.getByRole("button", { name: "Event" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText(/from calendar/i)).not.toBeInTheDocument();
  });

  it("shows a From calendar ribbon that resets everything on 'Not this one'", () => {
    storePrefill();
    render(<PostPlanPage />);

    expect(screen.getByText(/from calendar/i)).toHaveTextContent(
      /^From Calendar: Founders Coffee, .+–.+$/,
    );
    fireEvent.click(screen.getByRole("button", { name: /not this one/i }));

    expect(screen.queryByText(/from calendar/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Event" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Open to chat" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.queryByLabelText(/detail/i)).not.toBeInTheDocument();
    expect(preview()).toContain("Your plan");
  });

  it("leaves the duration at its default for a gmail candidate with no known time", () => {
    storePrefill({
      source: "gmail",
      title: "You're going to Founders Coffee",
      location: null,
      starts_at: null,
      ends_at: null,
    });
    render(<PostPlanPage />);

    expect(screen.getByRole("button", { name: "Event" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "2 hours" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText(/detail/i)).toHaveValue("You're going to Founders Coffee");
  });

  it("labels the ribbon by source and omits an unknown time range", () => {
    storePrefill({ source: "gmail", location: null, starts_at: null, ends_at: null });
    render(<PostPlanPage />);

    const ribbon = screen.getByText(/from inbox/i);
    expect(ribbon).toHaveTextContent("From Inbox: Founders Coffee");
    expect(ribbon.textContent).not.toMatch(/\d/);
  });

  it("leaves prefilled fields editable", () => {
    storePrefill();
    render(<PostPlanPage />);

    expect(screen.getByLabelText(/detail/i)).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Coffee" }));
    expect(screen.getByRole("button", { name: "Coffee" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Event" })).toHaveAttribute("aria-pressed", "false");
  });
});
