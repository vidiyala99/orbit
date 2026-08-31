import Link from "next/link";
import { cookies } from "next/headers";
import { fetchNearbyPlans, fetchNearbyRooms } from "@/lib/api";
import { RoomT } from "@/lib/types";
import { requireOnboarded } from "@/lib/requireOnboarded";
import SectionNav from "@/components/SectionNav";
import CalendarEventBanner from "@/components/CalendarEventBanner";
import EventRoomView from "@/components/EventRoomView";
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
  // The rooms rail is a desktop-only side note, so a failed lookup degrades to
  // an empty card rather than taking the whole wall down with it.
  const [plans, rooms] = await Promise.all([
    fetchNearbyPlans(lat, lon, RADIUS_M, new Date().toISOString(), token),
    token
      ? fetchNearbyRooms(lat, lon, RADIUS_M, token).catch(() => [] as RoomT[])
      : Promise.resolve([] as RoomT[]),
  ]);

  const firstName = user?.first_name ?? null;

  return (
    <main
      className={`mx-auto min-h-screen w-full max-w-md bg-ground ${
        token ? "pb-28 md:max-w-6xl md:pb-10 md:pt-16" : "pb-8 md:max-w-2xl"
      }`}
    >
      {/* Signed in, this row duplicates TopNav from `md` up, so it steps aside
          there. Signed out there is no TopNav, so it stays at every width. */}
      <nav
        className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-[18px] pt-4 ${
          token ? "md:hidden" : ""
        }`}
      >
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-[7px] text-sm font-bold text-ink">
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
            StayConnected
          </Link>
          <div className="flex items-center gap-3 text-[11.5px] font-medium text-ink3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        {token ? <UserMenu /> : <WaitlistForm />}
      </nav>

      {/* One column on mobile; from `md` up the wall keeps a readable measure
          in the main column and the rail picks up the dead space. Children keep
          their own `px-[18px]`, which doubles as the column gutter. */}
      <div
        data-testid="today-split"
        className="md:grid md:grid-cols-[minmax(0,1fr)_300px] md:items-start"
      >
        <div className="min-w-0">
          {/* `md:pt-5` matches the other SectionNav pages: on desktop the mobile
              nav row above is hidden, so this block carries the whole gap under
              the fixed TopNav. */}
          <div className="px-[18px] pt-3.5 md:pt-5">
            <h1 className="text-[23px] font-extrabold leading-tight tracking-[-0.3px] text-ink">
              {firstName ? `Hey, ${firstName}` : "Today"}
            </h1>
            {firstName ? (
              <p className="mt-[3px] text-xs font-medium text-ink3">
                {plans.length} {plans.length === 1 ? "plan" : "plans"} near you
                {user?.city ? ` · ${user.city}` : ""}
              </p>
            ) : (
              <>
                <p className="mt-[3px] text-xs font-medium text-ink3">
                  Networking runs on luck. This is the app for when it isn&apos;t.
                </p>
                <p className="text-xs font-medium text-ink3">
                  {plans.length} {plans.length === 1 ? "plan" : "plans"} near you
                </p>
              </>
            )}
          </div>

          {token && (
            <div className="px-[18px] py-3.5">
              <Link
                href="/post"
                className="lift btn-press block rounded-full bg-ink py-3 text-center text-[13.5px] font-bold text-ground shadow-raised hover:shadow-raised-hover"
              >
                + Post a plan
              </Link>
            </div>
          )}

          {/* `?calendar=connected|error` needs no handling: the banner re-derives
              state from `/me`, and a declined consent is a normal outcome, not an
              error worth surfacing. */}
          {token && (
            <CalendarEventBanner
              token={token}
              googleCalendarConnected={Boolean(user?.google_calendar_connected)}
            />
          )}

          {token && <EventRoomView token={token} />}

          <PlanFeed plans={plans} signedIn={Boolean(token)} />
        </div>

        {/* Rail: desktop only, and only when signed in — an anonymous visitor
            has no rooms to summarise. The calendar prompt deliberately stays
            inline above rather than being mirrored here. */}
        {token && (
          <aside
            aria-label="Rooms near you"
            className="hidden pr-[18px] pt-5 md:block"
          >
            <div className="rounded-card bg-surface p-4 shadow-card">
              <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-ink3">
                Rooms near you
              </p>
              {rooms.length === 0 ? (
                <p className="mt-2 text-[13px] leading-snug text-ink2">
                  No rooms near you yet.
                </p>
              ) : (
                <ul className="mt-2.5 flex flex-col gap-2.5">
                  {rooms.slice(0, 4).map((room) => (
                    <li key={room.id}>
                      <Link href={`/rooms/${room.id}`} className="group block rounded-xl">
                        <p className="truncate text-[13px] font-bold text-ink group-hover:underline">
                          {room.name}
                        </p>
                        <p className="mt-0.5 text-[11px] font-medium text-ink3">
                          {room.member_count} {room.member_count === 1 ? "member" : "members"}
                          {room.is_member ? " · joined" : ""}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/rooms"
                className="mt-3.5 block rounded-full bg-accent-soft py-2 text-center text-[11.5px] font-semibold text-ink transition-shadow hover:shadow-card"
              >
                Browse rooms →
              </Link>
            </div>
          </aside>
        )}
      </div>

      {/* Signed-in only: Map, Rooms and Chats all require a session, so the tab
          bar would be four dead ends for an anonymous visitor. */}
      {token && <SectionNav userInitial={firstName?.charAt(0).toUpperCase()} />}
    </main>
  );
}
