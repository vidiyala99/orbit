import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import ContactNote from "@/components/ContactNote";
import { fixtureAttendee } from "@/lib/demoFixtures";

export default async function ContactNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const token = (await cookies()).get("sc_token")?.value;
  if (!token) redirect("/sign-in");

  const { id } = await params;
  const attendee = fixtureAttendee(id);
  if (!attendee) notFound();

  return <ContactNote attendee={attendee} />;
}
