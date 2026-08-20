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

// jsdom doesn't implement IntersectionObserver either. Components like
// ReplayOnView defer rendering until an entry reports isIntersecting, so this
// stub fires immediately as "visible" — the sane default for tests that
// aren't specifically exercising scroll behavior. Tests that need granular
// control (see ReplayOnView.test.tsx) override this with a fuller mock in
// their own beforeEach.
class AlwaysVisibleIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: ReadonlyArray<number> = [];
  #callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.#callback = callback;
  }
  observe(target: Element) {
    this.#callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this,
    );
  }
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
window.IntersectionObserver ??= AlwaysVisibleIntersectionObserver;
