import { RoomPurposeT, RoomT } from "./types";

export const PURPOSES: { key: RoomPurposeT; label: string }[] = [
  { key: "cowork", label: "Cowork" },
  { key: "coffee_chat", label: "Coffee chat" },
  { key: "study_group", label: "Study group" },
  { key: "job_hunting", label: "Job hunting" },
  { key: "other", label: "Something else" },
];

export function purposeLabel(purpose: RoomPurposeT): string {
  return PURPOSES.find((p) => p.key === purpose)?.label ?? "Something else";
}

/** The API returns coordinates, not place names — there's no reverse geocoding
 *  on the client — so a pinned room shows its coordinates and an unpinned one
 *  falls back to what its visibility implies. */
export function locationLabel(room: RoomT): string {
  if (room.lat !== null && room.lon !== null) {
    return `${room.lat.toFixed(3)}, ${room.lon.toFixed(3)}`;
  }
  return room.visibility === "private" ? "Invite only" : "Anywhere nearby";
}

export function memberLabel(count: number): string {
  return `${count} ${count === 1 ? "member" : "members"}`;
}

/** The `count` days the day picker offers, starting at local midnight today. */
export function dayStrip(from: Date, count = 7): Date[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(from);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function dayChipLabel(day: Date): { weekday: string; date: string } {
  return {
    weekday: day.toLocaleDateString([], { weekday: "short" }),
    date: String(day.getDate()),
  };
}

export function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function timeRangeLabel(startsAt: string, endsAt: string): string {
  return `${timeLabel(startsAt)} – ${timeLabel(endsAt)}`;
}

/** "2 of 5 confirmed", or plain "Confirmed" once everyone has said yes. */
export function confirmationLabel(confirmed: number, total: number, status: string): string {
  if (status === "confirmed") return "Confirmed";
  return `${confirmed} of ${total} confirmed`;
}
