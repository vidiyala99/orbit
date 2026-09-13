import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { ReactNode } from "react";
import AttendeesList from "../AttendeesList";
import type { AttendeesDataT } from "@/lib/events";

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  function stripMotionProps({
    children,
    initial: _i,
    animate: _a,
    exit: _e,
    transition: _t,
    ...rest
  }: {
    children?: ReactNode;
    initial?: unknown;
    animate?: unknown;
    exit?: unknown;
    transition?: unknown;
  } & Record<string, unknown>) {
    return rest;
  }
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    motion: {
      ...actual.motion,
      ul: (props: { children?: ReactNode } & Record<string, unknown>) => {
        const rest = stripMotionProps(props);
        return <ul {...rest}>{props.children}</ul>;
      },
      li: (props: { children?: ReactNode } & Record<string, unknown>) => {
        const rest = stripMotionProps(props);
        return <li {...rest}>{props.children}</li>;
      },
    },
    useReducedMotion: () => true,
  };
});

const DATA: AttendeesDataT = {
  event: {
    id: "evt-1",
    title: "Blinkko Launch Party",
    location: "SOMA",
    guest_count: 3,
  },
  attendees: [
    {
      id: "1",
      name: "Riley Park",
      role: "Recruiter at Amazon",
      why: "Hiring PMs",
      priority: "needs_you",
      score: 0.9,
      avatar_url: null,
      linkedin_url: "https://www.linkedin.com/in/riley",
      x_url: null,
      triage_state: null,
    },
    {
      id: "2",
      name: "Sam Okonkwo",
      role: "Engineer at Stripe",
      why: "Building infra",
      priority: "later",
      score: 0.2,
      avatar_url: null,
      linkedin_url: null,
      x_url: "https://x.com/sam",
      triage_state: null,
    },
    {
      id: "3",
      name: "Alex Rivera",
      role: "Partner, Westbound",
      why: "Sees Meta alumni often",
      priority: "high",
      score: 0.5,
      avatar_url: null,
      linkedin_url: null,
      x_url: null,
      triage_state: "kept",
    },
  ],
};

describe("AttendeesList", () => {
  it("defaults to Best matches with hierarchy and back link", () => {
    render(<AttendeesList data={DATA} />);
    expect(screen.getByRole("link", { name: /← events/i })).toHaveAttribute("href", "/events");
    expect(screen.getByRole("button", { name: /best/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/focus shortlist/i)).toBeInTheDocument();
    expect(screen.getByText("Riley Park")).toBeInTheDocument();
    expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
    // later priority stays out of Best when high/needs_you exist
    expect(screen.queryByText("Sam Okonkwo")).not.toBeInTheDocument();
    expect(screen.getAllByText(/^Why meet$/i).length).toBeGreaterThan(0);
    // Mode chip says Best; rows must not also wear a redundant Best pill.
    const bestLabels = screen.getAllByText(/^Best$/);
    expect(bestLabels).toHaveLength(1);
    expect(bestLabels[0].closest("button")).toBeTruthy();
  });

  it("Everyone shows the full room and search works", async () => {
    render(<AttendeesList data={DATA} />);
    fireEvent.click(screen.getByRole("button", { name: /everyone/i }));
    await waitFor(() => expect(screen.getByText("Sam Okonkwo")).toBeInTheDocument());
    fireEvent.change(screen.getByRole("searchbox", { name: /search attendees/i }), {
      target: { value: "Amazon" },
    });
    expect(screen.getByText("Riley Park")).toBeInTheDocument();
    expect(screen.queryByText("Sam Okonkwo")).not.toBeInTheDocument();
  });

  it("Everyone paginates the room instead of one endless list", async () => {
    const many: AttendeesDataT = {
      ...DATA,
      attendees: Array.from({ length: 30 }, (_, i) => ({
        id: `g-${i}`,
        name: `Guest ${String(i + 1).padStart(2, "0")}`,
        role: `Role ${i + 1}`,
        why: "",
        priority: "later" as const,
        score: 1 - i * 0.01,
        avatar_url: null,
        linkedin_url: null,
        x_url: null,
        triage_state: null,
      })),
    };
    render(<AttendeesList data={many} />);
    fireEvent.click(screen.getByRole("button", { name: /everyone/i }));
    await waitFor(() => expect(screen.getByText("Guest 01")).toBeInTheDocument());
    expect(screen.getByText("Guest 24")).toBeInTheDocument();
    expect(screen.queryByText("Guest 25")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /guest pages/i })).toHaveTextContent("1");
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => expect(screen.getByText("Guest 25")).toBeInTheDocument());
    expect(screen.queryByText("Guest 01")).not.toBeInTheDocument();
  });

  it("every guest row links to person detail", async () => {
    render(<AttendeesList data={DATA} />);
    expect(screen.getByRole("link", { name: /riley park/i })).toHaveAttribute(
      "href",
      "/people/1?from=events&event=evt-1",
    );
    fireEvent.click(screen.getByRole("button", { name: /^kept/i }));
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /alex rivera/i })).toHaveAttribute(
        "href",
        "/people/3?from=events&event=evt-1",
      ),
    );
  });
});
