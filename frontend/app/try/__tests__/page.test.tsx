import { describe, it, expect, vi } from "vitest";
import TryPage from "../page";
import { APP_HOME } from "@/lib/routes";

const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
}));

describe("Try page", () => {
  it("redirects the old location-theme-map funnel to Slice A guests", () => {
    expect(() => TryPage()).toThrow(`REDIRECT:${APP_HOME}`);
    expect(redirect).toHaveBeenCalledWith("/attendees");
  });
});
