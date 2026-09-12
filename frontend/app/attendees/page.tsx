import { redirect } from "next/navigation";
import { loadAttendees } from "@/lib/events";
import { APP_EVENTS, eventPath } from "@/lib/routes";

export const dynamic = "force-dynamic";

/** Legacy Attendees tab → featured Event guest list (or Events picker). */
export default async function AttendeesRedirectPage() {
  const data = await loadAttendees();
  if (data.event) redirect(eventPath(data.event.id));
  redirect(APP_EVENTS);
}
