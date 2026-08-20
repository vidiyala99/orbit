import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import ReplayOnView from "../ReplayOnView";

let observerCallback: (entries: { isIntersecting: boolean }[]) => void;

beforeEach(() => {
  class MockIntersectionObserver {
    constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
      observerCallback = cb;
    }
    observe() {}
    disconnect() {}
  }
  // @ts-expect-error - test stub, not a full IntersectionObserver implementation
  window.IntersectionObserver = MockIntersectionObserver;
});

function Counter() {
  return <span data-testid="count">{Math.random()}</span>;
}

describe("ReplayOnView", () => {
  it("renders nothing until the element first enters the viewport", () => {
    render(<ReplayOnView>{() => <Counter />}</ReplayOnView>);
    expect(screen.queryByTestId("count")).not.toBeInTheDocument();

    act(() => observerCallback([{ isIntersecting: true }]));
    expect(screen.getByTestId("count")).toBeInTheDocument();
  });

  it("remounts children (restarting their animation state) on every re-entry", () => {
    render(<ReplayOnView>{() => <Counter />}</ReplayOnView>);

    act(() => observerCallback([{ isIntersecting: true }]));
    const firstValue = screen.getByTestId("count").textContent;

    act(() => observerCallback([{ isIntersecting: true }]));
    const secondValue = screen.getByTestId("count").textContent;

    expect(secondValue).not.toBe(firstValue);
  });

  it("does not remount on an exit event, only on entry", () => {
    render(<ReplayOnView>{() => <Counter />}</ReplayOnView>);
    act(() => observerCallback([{ isIntersecting: true }]));
    const firstValue = screen.getByTestId("count").textContent;

    act(() => observerCallback([{ isIntersecting: false }]));
    expect(screen.getByTestId("count").textContent).toBe(firstValue);
  });
});
