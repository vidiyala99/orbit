import type { AttendeeT } from "./types";

/** Full follow-up note — Copy note clipboard payload. */
export function note_payload(row: AttendeeT): string {
  return `Hi ${row.first_name} — we met at ${row.note.where_met}. We talked about ${row.note.what_talked} ${row.note.why}`;
}

/** Interchangeable DM draft — Copy DM clipboard payload. */
export function dm_payload(row: AttendeeT): string {
  return `Hey ${row.first_name} — ${row.note.where_met}. ${row.note.why}`;
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
