import { notFound } from "next/navigation";
import ContactNote from "@/components/ContactNote";
import { findDeskAttendee, loadDeskGuests } from "@/lib/guests";

export const dynamic = "force-dynamic";

export default async function ContactNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const desk = await loadDeskGuests();
  const attendee = findDeskAttendee(id, desk.attendees);
  if (!attendee) notFound();

  return <ContactNote attendee={attendee} />;
}
