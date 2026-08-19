import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Not auto-registered without `test.globals: true` in vitest.config.mts — without
// this, DOM from one `it` block leaks into the next within the same file.
afterEach(cleanup);
