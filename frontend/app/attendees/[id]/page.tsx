import { redirect } from "next/navigation";
import { personPath } from "@/lib/routes";

export const dynamic = "force-dynamic";

/** Legacy path — person detail lives at /people/[id]. */
export default async function AttendeeIdRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(personPath(id));
}
