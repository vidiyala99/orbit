import type { AttendeeT } from "./types";

/** Full follow-up note — Copy note clipboard payload. */
export function note_payload(row: AttendeeT): string {
  return `Hi ${row.first_name} — we met at ${row.note.where_met}. We talked about ${row.note.what_talked} ${row.note.why}`;
}

/** Interchangeable DM draft — Copy DM clipboard payload. */
export function dm_payload(row: AttendeeT): string {
  return `Hey ${row.first_name} — ${row.note.where_met}. ${row.note.why}`;
}
