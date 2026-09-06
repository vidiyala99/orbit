import type { AttendeeT } from "./types";

export function linkedInNoteText(row: AttendeeT): string {
  return `Hi ${row.first_name} — we met at ${row.note.where_met}. We talked about ${row.note.what_talked} ${row.note.why}`;
}

export function emailText(row: AttendeeT): string {
  return [
    `Hi ${row.first_name},`,
    "",
    `We met at ${row.note.where_met}.`,
    "",
    row.note.what_talked,
    "",
    row.note.why,
    "",
    "Best",
  ].join("\n");
}
