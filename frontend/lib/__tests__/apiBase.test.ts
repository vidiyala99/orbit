import { describe, it, expect } from "vitest";
import { PRODUCTION_API_BASE, resolveApiBase } from "../apiBase";

describe("resolveApiBase", () => {
  it("never uses localhost in a production build, even if env is unset", () => {
    expect(resolveApiBase(undefined, "production")).toBe(PRODUCTION_API_BASE);
    expect(resolveApiBase("", "production")).toBe(PRODUCTION_API_BASE);
  });

  it("strips a localhost override in production so Vercel cannot probe the LAN", () => {
    expect(resolveApiBase("http://localhost:8001", "production")).toBe(PRODUCTION_API_BASE);
    expect(resolveApiBase("http://127.0.0.1:8002", "production")).toBe(PRODUCTION_API_BASE);
  });

  it("keeps an explicit public API URL in production", () => {
    expect(resolveApiBase("https://orbit-api-a8ed.onrender.com/", "production")).toBe(
      PRODUCTION_API_BASE,
    );
  });

  it("allows localhost only in development", () => {
    expect(resolveApiBase(undefined, "development")).toBe("http://localhost:8001");
    expect(resolveApiBase("http://localhost:8001", "development")).toBe("http://localhost:8001");
  });
});
