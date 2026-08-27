"use client";
import { useState } from "react";
import Link from "next/link";
import { createRoom } from "@/lib/api";
import { getClientToken } from "@/lib/auth";
import { RoomPurposeT, RoomT, RoomVisibilityT } from "@/lib/types";
import { PURPOSES, locationLabel, memberLabel, purposeLabel } from "@/lib/rooms";

const CHIP =
  "btn-press rounded-full border px-[15px] py-[9px] text-[12.5px] font-semibold transition-colors duration-150";
const CHIP_ON = "border-accent bg-accent text-white";
const CHIP_OFF = "border-rule bg-surface text-ink hover:border-accent hover:bg-accent-soft";
const LABEL = "text-[11px] font-bold text-ink3";

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Could not create room";
}

/** Members are shown as overlapping discs. They used to be tinted from four
 *  different palette colours (including the green reserved for stamps); they
 *  are now one neutral so the accent stays meaningful. */
function AvatarStack({ count }: { count: number }) {
  return (
    <div className="flex" aria-hidden="true">
      {Array.from({ length: Math.min(Math.max(count, 1), 4) }).map((_, i) => (
        <span
          key={i}
          data-testid="room-avatar"
          className="-ml-1.5 h-[18px] w-[18px] rounded-full bg-rule ring-2 ring-surface first:ml-0"
          style={{ opacity: 1 - i * 0.12 }}
        />
      ))}
    </div>
  );
}

function VisibilityBadge({ visibility }: { visibility: RoomVisibilityT }) {
  const isPublic = visibility === "public";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em] ${
        isPublic ? "bg-accent-soft text-accent" : "bg-rule/60 text-ink2"
      }`}
    >
      {isPublic ? "Public" : "Private"}
    </span>
  );
}

function RoomCard({ room }: { room: RoomT; rotationSeed?: number }) {
  return (
    <li>
      <Link
        href={`/rooms/${room.id}`}
        className="lift block h-full rounded-card bg-surface p-4 shadow-card hover:shadow-card-hover"
      >
        <div className="flex items-start justify-between gap-2">
          <span data-testid="room-name" className="min-w-0 text-[14px] font-bold text-ink">
            {room.name}
          </span>
          <VisibilityBadge visibility={room.visibility} />
        </div>
        <p className="mt-0.5 text-[12.5px] font-medium text-ink2">{purposeLabel(room.purpose)}</p>
        <div className="mt-2.5 flex min-w-0 items-center gap-2 font-mono text-[10.5px] text-ink3">
          <AvatarStack count={room.member_count} />
          <span className="truncate">
            {memberLabel(room.member_count)} &middot; {locationLabel(room)}
          </span>
        </div>
      </Link>
    </li>
  );
}

export default function RoomsBrowser({ initialRooms }: { initialRooms: RoomT[] }) {
  const [rooms, setRooms] = useState(initialRooms);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState<RoomPurposeT | null>(null);
  const [visibility, setVisibility] = useState<RoomVisibilityT>("public");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const trimmedName = name.trim();
  const canCreate = Boolean(trimmedName) && purpose !== null;

  function resetForm() {
    setName("");
    setPurpose(null);
    setVisibility("public");
    setError(null);
  }

  function closeSheet() {
    setOpen(false);
    resetForm();
  }

  async function handleCreate() {
    if (!canCreate || !purpose) return;
    setSubmitting(true);
    setError(null);
    try {
      const room = await createRoom(
        { name: trimmedName, purpose, visibility },
        getClientToken() ?? "",
      );
      setRooms((current) => [room, ...current]);
      setOpen(false);
      resetForm();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {rooms.length === 0 ? (
        <div className="px-[18px] py-2">
          <div className="mx-auto max-w-sm rounded-card bg-surface p-6 text-center shadow-card">
            <p className="text-base font-bold leading-snug text-ink">
              Start one — a room is just a standing excuse to show up.
            </p>
            <p className="mt-2 text-[13px] text-ink2">No rooms near you yet.</p>
          </div>
        </div>
      ) : (
        <ul
          data-testid="rooms-list"
          className="grid grid-cols-1 gap-3 px-[18px] py-2 md:grid-cols-3 md:gap-4"
        >
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </ul>
      )}

      {/* Sits above the tab bar, inset from it so the two never read as one
          blob. Safe-area aware for the iOS home indicator. The tab bar is gone
          from `md` up, so the button drops to the bottom of the wider column. */}
      <div className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem)] left-1/2 z-10 w-[calc(100%-36px)] max-w-[28rem] -translate-x-1/2 md:bottom-8 md:max-w-6xl">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="lift btn-press pointer-events-auto rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-bold text-white shadow-raised hover:shadow-raised-hover"
          >
            <span aria-hidden="true" className="mr-1">
              +
            </span>
            New room
          </button>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeSheet();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-room-title"
            className="w-full max-w-md overscroll-contain rounded-t-[18px] bg-surface px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-sheet motion-safe:animate-[riseIn_220ms_ease-out]"
          >
            {/* Grab handle — signals "drag/dismissable sheet" without needing copy. */}
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-rule" aria-hidden="true" />

            <div className="flex items-center justify-between">
              <h2 id="new-room-title" className="text-[19px] font-extrabold tracking-[-0.3px] text-ink">
                New room
              </h2>
              <button
                type="button"
                onClick={closeSheet}
                aria-label="Close"
                className="btn-press -mr-1 flex h-8 w-8 items-center justify-center rounded-full text-base leading-none text-ink3 transition-colors hover:bg-accent-soft hover:text-ink"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <label htmlFor="room-name" className={`mt-4 block ${LABEL}`}>
              Name
            </label>
            <input
              id="room-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoComplete="off"
              placeholder="Founders Cowork Wednesdays"
              className="field mt-1.5 w-full rounded-field border border-rule bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink3"
            />

            <p className={`mt-4 ${LABEL}`}>Purpose</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {PURPOSES.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  aria-pressed={purpose === p.key}
                  onClick={() => setPurpose(p.key)}
                  className={`${CHIP} ${purpose === p.key ? CHIP_ON : CHIP_OFF}`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <p className={`mt-4 ${LABEL}`}>Visibility</p>
            <div className="mt-1.5 flex gap-2">
              {(
                [
                  { key: "public", label: "Public", sub: "Anyone nearby can join" },
                  { key: "private", label: "Private", sub: "Invite only" },
                ] as const
              ).map((v) => (
                <button
                  key={v.key}
                  type="button"
                  aria-pressed={visibility === v.key}
                  onClick={() => setVisibility(v.key)}
                  className={`btn-press flex-1 rounded-field border px-3 py-2.5 text-left text-sm font-semibold transition-colors duration-150 ${
                    visibility === v.key
                      ? "border-accent bg-accent text-white"
                      : "border-rule bg-surface text-ink hover:border-accent hover:bg-accent-soft"
                  }`}
                >
                  {v.label}
                  <span className="mt-0.5 block text-[10.5px] font-medium opacity-80">
                    {v.sub}
                  </span>
                </button>
              ))}
            </div>

            {error && (
              <p className="mt-3 text-[12px] font-semibold text-accent" role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleCreate}
              disabled={!canCreate || submitting}
              className="lift btn-press mt-5 w-full rounded-full bg-ink py-3.5 text-sm font-bold text-ground shadow-raised hover:shadow-raised-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {submitting ? "Creating..." : "Create room"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
