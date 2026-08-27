"use client";
import { useEffect, useMemo, useState } from "react";
import { confirmRoomProposal, createRoomProposal, fetchRoomAvailability } from "@/lib/api";
import { getClientToken } from "@/lib/auth";
import {
  confirmationLabel,
  dayChipLabel,
  dayLabel,
  dayStrip,
  sameDay,
  timeRangeLabel,
} from "@/lib/rooms";
import { MemberAvailabilityT, TimeProposalT } from "@/lib/types";

/** The visible slice of the day. Nobody proposes a 3am cowork, and a full 24h
 *  column would make every block unreadably short. */
const START_HOUR = 8;
const END_HOUR = 22;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const WINDOW_MINUTES = (END_HOUR - START_HOUR) * 60;

const LABEL = "text-[11px] font-bold text-ink3";

/** Where an instant sits in the visible column, as a 0–100 percentage. Times
 *  outside the window clamp to its edges rather than overflowing the track. */
function offsetPct(iso: string, day: Date): number {
  const t = new Date(iso);
  const minutes = (t.getTime() - day.getTime()) / 60_000 - START_HOUR * 60;
  return Math.min(100, Math.max(0, (minutes / WINDOW_MINUTES) * 100));
}

function hourLabel(hour: number): string {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric" });
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export default function RoomSchedule({
  roomId,
  currentUserId,
  initialProposals,
}: {
  roomId: string;
  currentUserId: string;
  initialProposals: TimeProposalT[];
}) {
  const [proposals, setProposals] = useState<TimeProposalT[]>(initialProposals);
  const [dayIndex, setDayIndex] = useState(0);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [availability, setAvailability] = useState<MemberAvailabilityT[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => dayStrip(new Date()), []);
  const day = days[dayIndex];

  useEffect(() => {
    let cancelled = false;
    const dayEnd = new Date(day);
    dayEnd.setDate(dayEnd.getDate() + 1);

    setAvailability(null);
    (async () => {
      try {
        const out = await fetchRoomAvailability(
          roomId,
          day.toISOString(),
          dayEnd.toISOString(),
          getClientToken() ?? "",
        );
        if (!cancelled) setAvailability(out.members);
      } catch {
        // Availability is an aid, not the point of the screen — a failed read
        // leaves the timeline usable with no busy blocks on it.
        if (!cancelled) setAvailability([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId, day]);

  const dayProposals = proposals.filter((p) => sameDay(new Date(p.starts_at), day));
  const confirmed = proposals.find((p) => p.status === "confirmed") ?? null;
  const connectedMembers = (availability ?? []).filter((m) => m.connected);

  function replaceProposal(next: TimeProposalT) {
    setProposals((prev) => {
      const without = prev.filter((p) => p.id !== next.id);
      return [...without, next].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    });
  }

  async function propose() {
    if (selectedHour === null || busy) return;
    const starts = new Date(day);
    starts.setHours(selectedHour, 0, 0, 0);
    const ends = new Date(starts);
    ends.setHours(selectedHour + 1);

    setBusy(true);
    setError(null);
    try {
      const created = await createRoomProposal(
        roomId,
        { starts_at: starts.toISOString(), ends_at: ends.toISOString() },
        getClientToken() ?? "",
      );
      replaceProposal(created);
      setSelectedHour(null);
    } catch (err) {
      setError(errorMessage(err, "Could not propose that time"));
    } finally {
      setBusy(false);
    }
  }

  async function confirm(proposalId: string) {
    setBusy(true);
    setError(null);
    try {
      replaceProposal(await confirmRoomProposal(roomId, proposalId, getClientToken() ?? ""));
    } catch (err) {
      setError(errorMessage(err, "Could not confirm that time"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-[18px] py-4">
      {confirmed && (
        <div
          data-testid="confirmed-plan"
          className="mb-4 rounded-card bg-surface p-4 shadow-raised"
        >
          <p className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.04em] text-accent">
            <span aria-hidden="true">✓</span> Confirmed
          </p>
          <p className="mt-2.5 text-[14px] font-bold text-ink">{dayLabel(confirmed.starts_at)}</p>
          <p className="font-mono text-[11px] text-ink3">
            {timeRangeLabel(confirmed.starts_at, confirmed.ends_at)}
          </p>
          <div className="mt-3 flex items-center gap-2 border-t border-rule pt-3">
            <div className="flex">
              {confirmed.confirmations.map((c) => (
                <span
                  key={c.id}
                  data-testid="confirmed-avatar"
                  className="relative -ml-1.5 h-6 w-6 rounded-full bg-rule ring-2 ring-surface first:ml-0"
                >
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-accent text-[7px] font-bold text-white"
                  >
                    ✓
                  </span>
                </span>
              ))}
            </div>
            <span className="font-mono text-[10.5px] text-ink3">
              {confirmed.confirmations.length} of {confirmed.member_count} in
            </span>
          </div>
        </div>
      )}

      <p className={LABEL}>Pick a day</p>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {days.map((d, i) => {
          const chip = dayChipLabel(d);
          const hasProposal = proposals.some((p) => sameDay(new Date(p.starts_at), d));
          const selected = i === dayIndex;
          return (
            <button
              key={d.toISOString()}
              type="button"
              data-testid={`day-chip-${i}`}
              aria-pressed={selected}
              onClick={() => {
                setDayIndex(i);
                setSelectedHour(null);
              }}
              className={`btn-press flex w-10 shrink-0 flex-col items-center rounded-card px-1.5 py-2 transition-colors ${
                selected ? "bg-ink text-ground" : "bg-surface text-ink shadow-card"
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.04em]">
                {chip.weekday}
              </span>
              <span className="text-[15px] font-extrabold leading-tight">{chip.date}</span>
              <span
                data-testid={hasProposal ? "day-dot" : undefined}
                aria-hidden="true"
                className={`mt-1 h-1.5 w-1.5 rounded-full ${
                  hasProposal ? (selected ? "bg-ground" : "bg-accent") : "bg-transparent"
                }`}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className={LABEL}>{dayLabel(day.toISOString())}</p>
        <p className="font-mono text-[10.5px] text-ink3">
          {availability === null
            ? "Loading calendars…"
            : connectedMembers.length === 0
              ? "No connected calendars"
              : `${connectedMembers.length} calendar${connectedMembers.length === 1 ? "" : "s"} shown`}
        </p>
      </div>

      <div className="relative mt-2 rounded-card bg-surface p-2 shadow-card">
        <div className="relative">
          {HOURS.map((h) => (
            <button
              key={h}
              type="button"
              data-testid={`hour-${h}`}
              aria-pressed={selectedHour === h}
              onClick={() => setSelectedHour(h)}
              className={`flex h-10 w-full items-start gap-2 border-t border-rule px-1 text-left first:border-t-0 ${
                selectedHour === h ? "bg-accent-soft" : ""
              }`}
            >
              <span className="w-12 shrink-0 font-mono text-[10px] text-ink3">{hourLabel(h)}</span>
            </button>
          ))}

          {/* Overlays share the hour track: proposals on the left, one narrow
              lane per member with a connected calendar on the right. */}
          <div className="pointer-events-none absolute inset-0 left-14">
            {dayProposals.map((p) => (
              <div
                key={p.id}
                data-testid={`proposed-block-${p.id}`}
                className={`pointer-events-auto absolute left-0 w-[58%] overflow-hidden rounded-[10px] px-2 py-1 ${
                  p.status === "confirmed"
                    ? "bg-accent-soft ring-1 ring-accent"
                    : "border border-dashed border-accent bg-accent-soft/60"
                }`}
                style={{
                  top: `${offsetPct(p.starts_at, day)}%`,
                  height: `${Math.max(
                    offsetPct(p.ends_at, day) - offsetPct(p.starts_at, day),
                    6,
                  )}%`,
                }}
              >
                <p className="truncate text-[10.5px] font-bold text-accent">
                  {timeRangeLabel(p.starts_at, p.ends_at)}
                </p>
                <p className="truncate font-mono text-[9.5px] text-ink3">
                  {confirmationLabel(p.confirmations.length, p.member_count, p.status)}
                </p>
              </div>
            ))}

            {connectedMembers.map((m, lane) =>
              m.busy.map((b, i) => (
                <div
                  key={`${m.user_id}-${i}`}
                  data-testid="busy-block"
                  title={m.user_id === currentUserId ? "You're busy" : "Member busy"}
                  className="absolute rounded-[6px] bg-rule/80"
                  style={{
                    top: `${offsetPct(b.starts_at, day)}%`,
                    height: `${Math.max(
                      offsetPct(b.ends_at, day) - offsetPct(b.starts_at, day),
                      4,
                    )}%`,
                    right: `${lane * 26}px`,
                    width: "22px",
                  }}
                />
              )),
            )}
          </div>
        </div>
      </div>

      {/* Confirming lives here rather than inside the block: an hour-long block
          is ~35px tall, too short to hold a button without clipping it. */}
      {dayProposals.length > 0 && (
        <ul className="mt-3 space-y-2">
          {dayProposals.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-card bg-surface px-3 py-2.5 shadow-card"
            >
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-bold text-ink">
                  {timeRangeLabel(p.starts_at, p.ends_at)}
                </p>
                <p className="font-mono text-[10px] text-ink3">
                  {confirmationLabel(p.confirmations.length, p.member_count, p.status)}
                </p>
              </div>
              {p.status !== "confirmed" && !p.confirmed_by_me && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => confirm(p.id)}
                  className="btn-press shrink-0 rounded-full bg-ink px-3 py-1.5 text-[11.5px] font-bold text-ground disabled:opacity-50"
                >
                  Confirm
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        disabled={selectedHour === null || busy}
        onClick={propose}
        className="lift btn-press mt-4 w-full rounded-full bg-ink py-3 text-sm font-bold text-ground shadow-raised hover:shadow-raised-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
      >
        Propose this time
      </button>

      {error && (
        <p className="mt-3 text-[12px] font-semibold text-accent" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
