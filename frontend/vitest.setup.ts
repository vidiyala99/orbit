import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Not auto-registered without `test.globals: true` in vitest.config.mts — without
// this, DOM from one `it` block leaks into the next within the same file.
afterEach(cleanup);

// jsdom doesn't implement matchMedia; components checking prefers-reduced-motion
// need this stub or they throw.
window.matchMedia ??= (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
});

// jsdom doesn't implement IntersectionObserver either; components like
// ReplayOnView need this no-op stub to construct without throwing. Tests that
// need to actually drive intersection events (see ReplayOnView.test.tsx)
// override this with a fuller mock in their own beforeEach.
class NoopIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: ReadonlyArray<number> = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
window.IntersectionObserver ??= NoopIntersectionObserver;
