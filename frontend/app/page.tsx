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
      <div className="p-4">
        <h1 className="font-hand text-2xl text-card">Today</h1>
        <p className="font-mono text-xs text-rule">{plans.length} plans pinned near you</p>
      </div>
      <PlanFeed plans={plans} />
    </main>
  );
}
