import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { fetchNearbyPlans } from "@/lib/api";
import PlanFeed from "@/components/PlanFeed";

export default async function Page() {
  const { getToken } = await auth();
  const token = (await getToken()) ?? "";
  // Mountain View, CA — replace with browser geolocation in a follow-up task
  const plans = token
    ? await fetchNearbyPlans(37.3861, -122.0839, 5000, new Date().toISOString(), token)
    : [];

  return (
    <main>
      <div className="flex items-center justify-between px-4 pt-4">
        <span className="font-display text-sm font-bold text-card">StayConnected</span>
        <SignedIn>
          <UserButton />
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal">
            <button className="font-mono text-xs text-accent">Sign in</button>
          </SignInButton>
        </SignedOut>
      </div>
      <div className="flex items-baseline justify-between p-4">
        <div>
          <h1 className="font-hand text-2xl text-card">Today</h1>
          <p className="font-mono text-xs text-rule">{plans.length} plans pinned near you</p>
        </div>
        <Link href="/post" className="font-mono text-xs text-accent">
          + Post a plan
        </Link>
      </div>
      <PlanFeed plans={plans} />
    </main>
  );
}
