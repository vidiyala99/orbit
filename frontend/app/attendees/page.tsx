import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AttendeeBrief from "@/components/AttendeeBrief";
import { FIXTURE_ATTENDEES, FIXTURE_EVENT } from "@/lib/demoFixtures";

export default async function AttendeesPage() {
  const token = (await cookies()).get("sc_token")?.value;
  if (!token) redirect("/sign-in");

  return <AttendeeBrief event={FIXTURE_EVENT} attendees={FIXTURE_ATTENDEES} />;
}
