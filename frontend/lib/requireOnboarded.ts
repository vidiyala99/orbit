import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchMe } from "./api";
import { UserT } from "./types";

/** Server-side onboarding gate for protected pages. If there's no session
 *  cookie, returns null so the caller can keep its existing unauthenticated
 *  behavior (discovery pages are intentionally public). If the user is
 *  signed in but hasn't finished onboarding, redirects to /onboarding —
 *  this throws internally via Next.js's redirect mechanism and never
 *  returns. Otherwise returns the fetched user. */
export async function requireOnboarded(): Promise<UserT | null> {
  const token = (await cookies()).get("sc_token")?.value;
  if (!token) return null;

  const user = await fetchMe(token);
  if (!user.onboarded_at) {
    redirect("/onboarding");
  }
  return user;
}
