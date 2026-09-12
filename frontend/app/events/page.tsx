import EventsList from "@/components/EventsList";
import { loadEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

/** Synced Events — room picker for catch-up guest search. */
export default async function EventsPage() {
  const events = await loadEvents();
  return <EventsList events={events} />;
}
