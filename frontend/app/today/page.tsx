import Link from "next/link";
import { cookies } from "next/headers";
import { fetchNearbyPlans } from "@/lib/api";
import { requireOnboarded } from "@/lib/requireOnboarded";
import CalendarEventBanner from "@/components/CalendarEventBanner";
import PlanFeed from "@/components/PlanFeed";
import WaitlistForm from "@/components/WaitlistForm";
import UserMenu from "@/components/UserMenu";

/** Mountain View, CA — used for anonymous visitors and for signed-in users
 *  whose city never geocoded (lat/lon null). */
const FALLBACK_LAT = 37.3861;
const FALLBACK_LON = -122.0839;
const RADIUS_M = 5000;

const NAV_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
];

export default async function TodayPage() {
  const token = (await cookies()).get("sc_token")?.value;
  // Discovery is public — anyone can see what's around, signed in or not.
  // Signed-in users must have finished onboarding first; redirects if not.
  const user = token ? await requireOnboarded() : null;

  const lat = user?.lat ?? FALLBACK_LAT;
  const lon = user?.lon ?? FALLBACK_LON;
  const plans = await fetchNearbyPlans(lat, lon, RADIUS_M, new Date().toISOString(), token);

  const firstName = user?.first_name ?? null;

  return (
    <main className="min-h-screen bg-board [background-image:radial-gradient(rgba(0,0,0,.12)_1px,transparent_1px)] [background-size:7px_7px]">
      <nav className="flex items-center justify-between gap-4 border-b border-board px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-1.5 font-display text-sm font-bold text-card">
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
            StayConnected
          </Link>
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase text-rule">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        {token ? <UserMenu /> : <WaitlistForm />}
      </nav>

      <div className="flex items-baseline justify-between gap-4 p-4">
        <div>
          <h1 className="font-hand text-2xl text-card">
            {firstName ? `Hey ${firstName} —` : "Today"}
          </h1>
          {firstName ? (
            <p className="font-mono text-xs text-rule">
              {plans.length} {plans.length === 1 ? "plan" : "plans"} pinned near you
              {user?.city ? ` in ${user.city}` : ""}
            </p>
          ) : (
            <>
              <p className="font-mono text-xs text-rule">
                Networking runs on luck. This is the app for when it isn&apos;t.
              </p>
              <p className="font-mono text-xs text-rule">
                {plans.length} {plans.length === 1 ? "plan" : "plans"} pinned near you
              </p>
            </>
          )}
        </div>
        {token && (
          <Link href="/post" className="font-mono text-xs text-accent">
            + Post a plan
          </Link>
        )}
      </div>

      {/* `?calendar=connected|error` needs no handling: the banner re-derives
          state from `/me`, and a declined consent is a normal outcome, not an
          error worth surfacing. */}
      {token && (
        <CalendarEventBanner
          token={token}
          googleCalendarConnected={Boolean(user?.google_calendar_connected)}
        />
      )}

      <PlanFeed plans={plans} signedIn={Boolean(token)} />
    </main>
  );
}
