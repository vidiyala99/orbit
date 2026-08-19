import { fetchNearbyPlans } from "@/lib/api";
import PlanFeed from "@/components/PlanFeed";
import WaitlistForm from "@/components/WaitlistForm";

export default async function TodayPage() {
  // TEMP: Clerk removed pending the custom-auth build (see
  // docs/superpowers/plans/2026-08-19-custom-auth.md); real cookie-based
  // token read lands in that plan's Task 13. Treated as signed-out for now.
  const token = undefined;
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
        {/* TEMP: sign-up/sign-in aren't functional until the custom-auth build
            lands, so every primary CTA is the waitlist for now (per
            docs/superpowers/specs/2026-08-19-landing-page-design.md). */}
        <WaitlistForm />
      </div>
      <div className="flex items-baseline justify-between p-4">
        <div>
          <h1 className="font-hand text-2xl text-card">Today</h1>
          <p className="font-mono text-xs text-rule">{plans.length} plans pinned near you</p>
        </div>
      </div>
      <PlanFeed plans={plans} />
    </main>
  );
}
