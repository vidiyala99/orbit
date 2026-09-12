import { notFound } from "next/navigation";
import ContactNote from "@/components/ContactNote";
import { findDeskAttendee, isPreEvent, loadDeskGuests } from "@/lib/guests";
import { APP_HOME, APP_INBOX, eventPath } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; event?: string }>;
}) {
  const { id } = await params;
  const { from, event: eventId } = await searchParams;
  const desk = await loadDeskGuests(eventId);
  const attendee = findDeskAttendee(id, desk.attendees);
  if (!attendee) notFound();

  const fromHome = from === "home";
  const fromEvents = from === "events" && !!eventId;

  return (
    <ContactNote
      attendee={attendee}
      preEvent={isPreEvent(desk.event)}
      backHref={fromHome ? APP_HOME : fromEvents ? eventPath(eventId) : APP_INBOX}
      backLabel={fromHome ? "Back to Home" : fromEvents ? "Back to guests" : "Back to Inbox"}
    />
  );
}
