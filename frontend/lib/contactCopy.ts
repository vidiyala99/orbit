import type { AttendeeT } from "./types";

/** Primary clipboard payload — the filled follow-up note. */
export function noteText(row: AttendeeT): string {
  return `Hi ${row.first_name} — we met at ${row.note.where_met}. We talked about ${row.note.what_talked} ${row.note.why}`;
}

/** Interchangeable shorter payload for a DM. */
export function dmText(row: AttendeeT): string {
  return `Hey ${row.first_name} — ${row.note.where_met}. ${row.note.why}`;
}
