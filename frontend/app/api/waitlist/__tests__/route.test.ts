import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../route";

describe("POST /api/waitlist", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("rejects invalid email", async () => {
    const res = await POST(
      new Request("http://localhost/api/waitlist", {
        method: "POST",
        body: JSON.stringify({ email: "not-an-email" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("accepts without upstream when WAITLIST_FORM_ENDPOINT is unset", async () => {
    vi.stubEnv("WAITLIST_FORM_ENDPOINT", "");
    const res = await POST(
      new Request("http://localhost/api/waitlist", {
        method: "POST",
        body: JSON.stringify({ email: "a@b.co" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, stored: false });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("forwards to Formspree when WAITLIST_FORM_ENDPOINT is set", async () => {
    vi.stubEnv("WAITLIST_FORM_ENDPOINT", "https://formspree.io/f/test");
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 200 }));
    const res = await POST(
      new Request("http://localhost/api/waitlist", {
        method: "POST",
        body: JSON.stringify({ email: "founder@example.com" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      "https://formspree.io/f/test",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "founder@example.com" }),
      }),
    );
  });
});
