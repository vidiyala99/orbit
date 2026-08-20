import Link from "next/link";
import { cookies } from "next/headers";
import { fetchNearbyPlans } from "@/lib/api";
import PlanFeed from "@/components/PlanFeed";
import WaitlistForm from "@/components/WaitlistForm";
import UserMenu from "@/components/UserMenu";

export default async function TodayPage() {
  const token = (await cookies()).get("sc_token")?.value;
  // Discovery is public — anyone can see what's around, signed in or not.
  // Mountain View, CA — replace with browser geolocation in a follow-up task
  const plans = await fetchNearbyPlans(37.3861, -122.0839, 5000, new Date().toISOString(), token);

  return (
    <main>
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <span className="font-display text-sm font-bold text-card">StayConnected</span>
          <p className="font-mono text-[11px] text-rule">
            Networking runs on luck. This is the app for when it isn&apos;t.
          </p>
        </div>
        {token ? <UserMenu /> : <WaitlistForm />}
      </div>
      <div className="flex items-baseline justify-between p-4">
        <div>
          <h1 className="font-hand text-2xl text-card">Today</h1>
          <p className="font-mono text-xs text-rule">{plans.length} plans pinned near you</p>
        </div>
        {token && (
          <Link href="/post" className="font-mono text-xs text-accent">
            + Post a plan
          </Link>
        )}
      </div>
      <PlanFeed plans={plans} />
    </main>
  );
}
