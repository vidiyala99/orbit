import Inbox from "@/components/Inbox";
import { loadInbox } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const people = await loadInbox();
  return <Inbox people={people} />;
}
