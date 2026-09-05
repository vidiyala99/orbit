import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ExplorePage from "../page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/explore",
}));

describe("ExplorePage", () => {
  it("shows one-tap category chips that go to the nearby shortlist", () => {
    document.cookie = "sc_token=tok; path=/";
    render(<ExplorePage />);
    expect(screen.getByRole("heading", { name: /what are you into/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^tech$/i })).toHaveAttribute("href", "/map?category=tech");
    expect(screen.getByRole("link", { name: /^design$/i })).toHaveAttribute("href", "/map?category=design");
    expect(screen.getByRole("link", { name: /^food$/i })).toHaveAttribute("href", "/map?category=food");
    expect(screen.getByRole("link", { name: /^music$/i })).toHaveAttribute("href", "/map?category=music");
    expect(screen.getByRole("link", { name: /^sports$/i })).toHaveAttribute("href", "/map?category=sports");
    expect(screen.getByRole("link", { name: /^outdoors$/i })).toHaveAttribute("href", "/map?category=outdoors");
  });
});
