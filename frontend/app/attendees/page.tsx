import AttendeeBrief from "@/components/AttendeeBrief";
import { FIXTURE_ATTENDEES, FIXTURE_EVENT } from "@/lib/demoFixtures";

export default function AttendeesPage() {
  return <AttendeeBrief event={FIXTURE_EVENT} attendees={FIXTURE_ATTENDEES} />;
}
