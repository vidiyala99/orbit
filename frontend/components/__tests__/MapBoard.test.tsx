import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import MapBoard from "../MapBoard";
import { PlanT, RoomT } from "@/lib/types";

const CENTER = { lat: 37.3861, lon: -122.0839 };

function makePlan(over: Partial<PlanT> = {}): PlanT {
  return {
    id: "p1",
    user_id: "u2",
    activity: "coffee",
    openness: "open_to_chat",
    detail: null,
    text: "Grabbing coffee, open to chat",
    lat: 37.39,
    lon: -122.08,
    starts_at: new Date(Date.now() - 60000).toISOString(),
    ends_at: new Date(Date.now() + 45 * 60000).toISOString(),
    ...over,
  };
}

function makeRoom(over: Partial<RoomT> = {}): RoomT {
  return {
    id: "r1",
    creator_id: "u1",
    name: "Founders Cowork Wednesdays",
    purpose: "cowork",
    visibility: "public",
    lat: 37.383,
    lon: -122.09,
    created_at: "2026-08-20T10:00:00Z",
    member_count: 7,
    is_member: false,
    ...over,
  };
}

beforeEach(() => {
  // jsdom has no layout engine, so scrollIntoView is undefined on elements.
  Element.prototype.scrollIntoView = vi.fn();
});

function renderBoard(plans = [makePlan()], rooms = [makeRoom()], events = []) {
  render(<MapBoard plans={plans} rooms={rooms} events={events} center={CENTER} />);
}

describe("MapBoard pins", () => {
  it("renders a pin per plan and per room", () => {
    renderBoard();
    expect(screen.getByTestId("pin-plan-p1")).toBeInTheDocument();
    expect(screen.getByTestId("pin-room-r1")).toBeInTheDocument();
  });

  it("renders a 'you are here' pin at the center", () => {
    renderBoard();
    expect(screen.getByTestId("pin-you")).toBeInTheDocument();
  });

  it("skips rooms that have no coordinates but still lists them", () => {
    renderBoard([makePlan()], [makeRoom({ lat: null, lon: null })]);
    expect(screen.queryByTestId("pin-room-r1")).not.toBeInTheDocument();
    expect(screen.getByTestId("item-room-r1")).toBeInTheDocument();
  });

  it("renders no event pins because there is no event data source yet", () => {
    renderBoard();
    expect(screen.queryByTestId(/^pin-event-/)).not.toBeInTheDocument();
  });
});

describe("MapBoard list", () => {
  it("lists every plan and room below the map", () => {
    renderBoard();
    const list = screen.getByTestId("nearby-list");
    expect(within(list).getByText("Grabbing coffee, open to chat")).toBeInTheDocument();
    expect(within(list).getByText("Founders Cowork Wednesdays")).toBeInTheDocument();
  });

  it("describes a room item with its visibility and member count", () => {
    renderBoard();
    expect(screen.getByTestId("item-room-r1")).toHaveTextContent(/Room.*Public.*7 members/);
  });

  it("shows an empty state when nothing is nearby", () => {
    renderBoard([], []);
    expect(screen.getByText(/nothing pinned near you yet/i)).toBeInTheDocument();
  });
});

describe("MapBoard pin/list sync", () => {
  it("highlights the matching list item when a pin is tapped", () => {
    renderBoard();
    fireEvent.click(screen.getByTestId("pin-plan-p1"));
    expect(screen.getByTestId("item-plan-p1")).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId("pin-plan-p1")).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId("item-room-r1")).toHaveAttribute("aria-current", "false");
  });

  it("highlights the matching pin when a list item is tapped", () => {
    renderBoard();
    fireEvent.click(screen.getByTestId("item-room-r1"));
    expect(screen.getByTestId("pin-room-r1")).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId("pin-plan-p1")).toHaveAttribute("aria-current", "false");
  });

  it("scrolls the selected list item into view", () => {
    renderBoard();
    fireEvent.click(screen.getByTestId("pin-plan-p1"));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("moves the selection rather than accumulating it", () => {
    renderBoard();
    fireEvent.click(screen.getByTestId("pin-plan-p1"));
    fireEvent.click(screen.getByTestId("pin-room-r1"));
    expect(screen.getByTestId("item-plan-p1")).toHaveAttribute("aria-current", "false");
    expect(screen.getByTestId("item-room-r1")).toHaveAttribute("aria-current", "true");
  });
});

describe("MapBoard desktop layout", () => {
  it("splits into a sidebar and a map column from md up", () => {
    renderBoard();
    expect(screen.getByTestId("map-split").className).toMatch(/md:grid-cols-\[290px_minmax\(0,1fr\)\]/);
  });
});

describe("MapBoard detail card", () => {
  it("shows nothing until a marker is selected", () => {
    renderBoard();
    expect(screen.queryByTestId("map-detail")).not.toBeInTheDocument();
  });

  it("shows the selected marker's title and meta", () => {
    renderBoard();
    fireEvent.click(screen.getByTestId("pin-room-r1"));
    const card = screen.getByTestId("map-detail");
    expect(within(card).getByText("Founders Cowork Wednesdays")).toBeInTheDocument();
    expect(card).toHaveTextContent(/Room.*Public.*7 members/);
  });

  it("links a room to its room page and a plan to its plan page", () => {
    renderBoard();
    fireEvent.click(screen.getByTestId("pin-room-r1"));
    expect(within(screen.getByTestId("map-detail")).getByRole("link")).toHaveAttribute(
      "href",
      "/rooms/r1",
    );

    fireEvent.click(screen.getByTestId("item-plan-p1"));
    expect(within(screen.getByTestId("map-detail")).getByRole("link")).toHaveAttribute(
      "href",
      "/plans/p1",
    );
  });

  it("closes when the dismiss button is pressed", () => {
    renderBoard();
    fireEvent.click(screen.getByTestId("pin-plan-p1"));
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByTestId("map-detail")).not.toBeInTheDocument();
    expect(screen.getByTestId("item-plan-p1")).toHaveAttribute("aria-current", "false");
  });

  it("disappears when the selected marker's kind is filtered out", () => {
    renderBoard();
    fireEvent.click(screen.getByTestId("pin-room-r1"));
    fireEvent.click(screen.getByRole("button", { name: /rooms/i }));
    expect(screen.queryByTestId("map-detail")).not.toBeInTheDocument();
  });
});

describe("MapBoard compact", () => {
  it("is pins-only: no nearby list, activity on pin tap, empty on the map", () => {
    render(
      <MapBoard
        plans={[makePlan({ activity: "event", detail: "Hack table" })]}
        rooms={[]}
        events={[]}
        people={[
          {
            user_id: "u3",
            first_name: "Priya",
            last_name: "Raman",
            status: "Working in a café",
            lat: 37.38,
            lon: -122.09,
          },
        ]}
        center={CENTER}
        compact
      />,
    );
    expect(screen.getByTestId("pin-plan-p1")).toBeInTheDocument();
    expect(screen.getByTestId("pin-person-u3")).toBeInTheDocument();
    expect(screen.queryByTestId("nearby-list")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /rooms/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /plans/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /people/i })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("pin-plan-p1"));
    expect(screen.getByTestId("pin-activity")).toHaveTextContent(/event/i);
  });

  it("shows an empty overlay when nothing is pinned", () => {
    render(<MapBoard plans={[]} rooms={[]} events={[]} people={[]} center={CENTER} compact />);
    expect(screen.getByTestId("map-empty")).toBeInTheDocument();
    expect(screen.getByText(/nothing pinned near you yet/i)).toBeInTheDocument();
  });
});

describe("MapBoard people pins", () => {
  it("renders a person pin and a People filter when people are passed", () => {
    render(
      <MapBoard
        plans={[]}
        rooms={[]}
        events={[]}
        people={[
          {
            user_id: "u3",
            first_name: "Priya",
            last_name: "Raman",
            status: "Working in a café",
            lat: 37.39,
            lon: -122.08,
          },
        ]}
        center={CENTER}
      />,
    );
    expect(screen.getByTestId("pin-person-u3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /people/i })).toBeInTheDocument();
    expect(screen.getByText(/priya raman/i)).toBeInTheDocument();
    expect(screen.getByText(/working in a café/i)).toBeInTheDocument();
  });
});

describe("MapBoard filters", () => {
  it("hides both the pin and the list item for a toggled-off kind", () => {
    renderBoard();
    fireEvent.click(screen.getByRole("button", { name: /plans/i }));
    expect(screen.queryByTestId("pin-plan-p1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("item-plan-p1")).not.toBeInTheDocument();
    expect(screen.getByTestId("pin-room-r1")).toBeInTheDocument();
  });

  it("toggles a kind back on", () => {
    renderBoard();
    fireEvent.click(screen.getByRole("button", { name: /rooms/i }));
    expect(screen.queryByTestId("item-room-r1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /rooms/i }));
    expect(screen.getByTestId("item-room-r1")).toBeInTheDocument();
  });

  it("starts with every filter on", () => {
    renderBoard();
    expect(screen.getByRole("button", { name: /plans/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /rooms/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /events/i })).toHaveAttribute("aria-pressed", "true");
  });
});
