import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CreateRoomField from "../CreateRoomField";
import * as api from "@/lib/api";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("CreateRoomField", () => {
  beforeEach(() => {
    push.mockReset();
    document.cookie = "sc_token=tok; path=/";
  });

  it("creates a public room from a single name field", async () => {
    vi.spyOn(api, "createRoom").mockResolvedValue({ id: "r9" } as never);
    render(<CreateRoomField lat={37.38} lon={-122.08} />);
    fireEvent.change(screen.getByLabelText(/create a room/i), { target: { value: "Late coffee" } });
    fireEvent.click(screen.getByRole("button", { name: /create/i }));
    await waitFor(() => expect(api.createRoom).toHaveBeenCalled());
    expect(api.createRoom).toHaveBeenCalledWith(
      { name: "Late coffee", purpose: "other", visibility: "public", lat: 37.38, lon: -122.08 },
      "tok",
    );
    expect(push).toHaveBeenCalledWith("/rooms/r9");
  });
});
