import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { getClientToken, setClientToken, clearClientToken, ensureClientToken } from "@/lib/auth";
import * as api from "@/lib/api";

describe("client token cookie helpers", () => {
  beforeEach(() => {
    document.cookie = "sc_token=; path=/; max-age=0";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when no cookie is set", () => {
    expect(getClientToken()).toBeNull();
  });

  it("round-trips a token through set and get", () => {
    setClientToken("abc123");
    expect(getClientToken()).toBe("abc123");
  });

  it("clears the token", () => {
    setClientToken("abc123");
    clearClientToken();
    expect(getClientToken()).toBeNull();
  });

  it("ensureClientToken reuses an existing cookie", async () => {
    setClientToken("existing");
    const demo = vi.spyOn(api, "demoLogin");
    await expect(ensureClientToken()).resolves.toBe("existing");
    expect(demo).not.toHaveBeenCalled();
  });

  it("ensureClientToken demo-logs in when the cookie is missing", async () => {
    vi.spyOn(api, "demoLogin").mockResolvedValue({
      access_token: "minted",
      user: { id: "u1" } as never,
    });
    await expect(ensureClientToken()).resolves.toBe("minted");
    expect(getClientToken()).toBe("minted");
  });
});
