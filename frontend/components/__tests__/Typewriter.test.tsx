import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Typewriter from "../Typewriter";

describe("Typewriter", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("reveals the text progressively over time", () => {
    render(<Typewriter text="Hi" speedMs={10} data-testid="tw" />);
    expect(screen.getByTestId("tw").textContent).toBe("▍");

    act(() => vi.advanceTimersByTime(10));
    expect(screen.getByTestId("tw").textContent).toBe("H▍");

    act(() => vi.advanceTimersByTime(20));
    expect(screen.getByTestId("tw").textContent).toBe("Hi");
  });
});
