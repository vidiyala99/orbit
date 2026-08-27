"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addRoomMember, joinRoom, leaveRoom } from "@/lib/api";
import { getClientToken } from "@/lib/auth";
import { RoomT } from "@/lib/types";

const LABEL = "text-[11px] font-bold text-ink3";
const BTN_PRIMARY =
  "lift btn-press rounded-full bg-ink text-sm font-bold text-ground shadow-raised hover:shadow-raised-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export default function RoomMembership({ room }: { room: RoomT }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMemberId, setNewMemberId] = useState("");
  const [added, setAdded] = useState<string | null>(null);

  const trimmedId = newMemberId.trim();

  async function run(fn: () => Promise<unknown>, fallback: string, after?: () => void) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      after?.();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      {room.is_member ? (
        <div className="flex items-center justify-between gap-3">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.04em] text-accent">
            <span aria-hidden="true">✓</span> You&apos;re a member
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(() => leaveRoom(room.id, getClientToken() ?? ""), "Could not leave room")
            }
            className="btn-press rounded-full px-2.5 py-1 text-[11.5px] font-semibold text-ink3 transition-colors hover:bg-accent-soft hover:text-ink disabled:opacity-50"
          >
            Leave room
          </button>
        </div>
      ) : (
        room.visibility === "public" && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(() => joinRoom(room.id, getClientToken() ?? ""), "Could not join room")
            }
            className={`${BTN_PRIMARY} w-full py-3`}
          >
            Join room
          </button>
        )
      )}

      {room.visibility === "private" && room.is_member && (
        <div className="mt-4 border-t border-rule pt-3.5">
          <label htmlFor="add-member" className={`block ${LABEL}`}>
            Add someone
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="add-member"
              value={newMemberId}
              onChange={(e) => setNewMemberId(e.target.value)}
              placeholder="User ID"
              autoComplete="off"
              className="field min-w-0 flex-1 rounded-field border border-rule bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink3"
            />
            <button
              type="button"
              disabled={busy || !trimmedId}
              onClick={() =>
                run(
                  () => addRoomMember(room.id, trimmedId, getClientToken() ?? ""),
                  "Could not add member",
                  () => {
                    setAdded(trimmedId);
                    setNewMemberId("");
                  },
                )
              }
              className={`${BTN_PRIMARY} shrink-0 px-4 py-2.5`}
            >
              Add
            </button>
          </div>
          {added && (
            <p className="mt-2 text-[11.5px] font-semibold text-accent">Added {added}.</p>
          )}
        </div>
      )}

      {error && (
        <p className="mt-3 text-[12px] font-semibold text-accent" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
