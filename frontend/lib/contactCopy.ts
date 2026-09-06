import type { AttendeeT, ContactNoteT } from "./types";

type NoteSource = Pick<AttendeeT, "first_name"> & { note: ContactNoteT };

/** Compose the Copy note clipboard string from stacked contact fields. */
export function compose_note_payload(row: NoteSource): string {
  return `Hi ${row.first_name} — we met at ${row.note.where_met}. We talked about ${row.note.what_talked} ${row.note.why}`;
}

/** Compose the Copy DM clipboard string from the same fields. */
export function compose_dm_payload(row: NoteSource): string {
  return `Hey ${row.first_name} — ${row.note.where_met}. ${row.note.why}`;
}

/** Full follow-up note — prefers the person field Engine seeds. */
export function note_payload(row: AttendeeT): string {
  return row.note_payload || compose_note_payload(row);
}

/** Interchangeable DM draft — prefers the person field Engine seeds. */
export function dm_payload(row: AttendeeT): string {
  return row.dm_payload || compose_dm_payload(row);
}

export function attendeeEmail(row: AttendeeT): string {
  return `${row.first_name}.${row.last_name}@orbit.demo`.toLowerCase().replace(/\s+/g, "");
}

function fallbackCopy(text: string) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  document.body.removeChild(area);
}

export async function writeClipboard(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await Promise.race([
        navigator.clipboard.writeText(text),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error("clipboard timeout")), 400);
        }),
      ]);
      return;
    }
  } catch {
    /* Permissions, timeout, or missing secure context. */
  }
  fallbackCopy(text);
}
