import AttendeesList from "@/components/AttendeesList";
import { loadEventAttendees } from "@/lib/events";

export const dynamic = "force-dynamic";

/** Full searchable guest list for one Event. */
export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadEventAttendees(id);
  return <AttendeesList data={data} />;
}
