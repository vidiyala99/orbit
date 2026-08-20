import { describe, it, expect, beforeEach } from "vitest";
import { getClientToken, setClientToken, clearClientToken } from "@/lib/auth";

describe("client token cookie helpers", () => {
  beforeEach(() => {
    document.cookie = "sc_token=; path=/; max-age=0";
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
});
