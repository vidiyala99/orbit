import AttendeeBrief from "@/components/AttendeeBrief";
import { loadDeskGuests } from "@/lib/guests";

export const dynamic = "force-dynamic";

export default async function AttendeesPage() {
  const desk = await loadDeskGuests();
  return <AttendeeBrief event={desk.event} attendees={desk.attendees} />;
}
