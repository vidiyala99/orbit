import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchNearbyPlans, fetchNearbyRooms } from "@/lib/api";
import { requireOnboarded } from "@/lib/requireOnboarded";
import { categoryLabel } from "@/lib/categories";
import SectionNav from "@/components/SectionNav";
import EventResearchPanel from "@/components/EventResearchPanel";
import MapBoard, { MapEventT } from "@/components/MapBoard";

const FALLBACK_LAT = 37.3861;
const FALLBACK_LON = -122.0839;
const RADIUS_M = 5000;

const EVENTS: MapEventT[] = [];

export default async function MapPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string }>;
} = {}) {
  const token = (await cookies()).get("sc_token")?.value;
  if (!token) redirect("/sign-in");
  const session = token;
  const params = searchParams ? await searchParams : {};
  const category = params.category;
  const vibe = categoryLabel(category);

  const user = await requireOnboarded();
  const lat = user?.lat ?? FALLBACK_LAT;
  const lon = user?.lon ?? FALLBACK_LON;

  const [plans, rooms] = await Promise.all([
    fetchNearbyPlans(lat, lon, RADIUS_M, new Date().toISOString(), token, category),
    fetchNearbyRooms(lat, lon, RADIUS_M, token, category),
  ]);

  const total = plans.length + rooms.length + EVENTS.length;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-ground pb-28 md:max-w-6xl md:pb-10 md:pt-16">
      <header className="px-[18px] pb-3 pt-5">
        <h1 className="text-[23px] font-extrabold leading-tight tracking-[-0.3px] text-ink">
          {vibe ? `${vibe} nearby` : user?.first_name ? `Hey, ${user.first_name}` : "Map"}
        </h1>
        <p className="mt-[3px] text-xs font-medium text-ink3">
          {total} {total === 1 ? "thing" : "things"} nearby
          {user?.city ? ` in ${user.city}` : ""}
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/explore"
            className="btn-press flex-1 rounded-full border border-rule bg-surface py-2.5 text-center text-[13px] font-semibold text-ink"
          >
            Change category
          </Link>
          <Link
            href="/post"
            className="lift btn-press flex-1 rounded-full bg-ink py-2.5 text-center text-[13px] font-bold text-ground shadow-raised hover:shadow-raised-hover"
          >
            + Organize an event
          </Link>
        </div>
        <div className="mt-2 flex gap-2">
          <Link
            href="/attendees"
            className="flex-1 rounded-full bg-accent-soft py-2 text-center text-[12px] font-bold text-accent"
          >
            Find people
          </Link>
          <Link
            href="/rooms"
            className="flex-1 rounded-full bg-accent-soft py-2 text-center text-[12px] font-bold text-accent"
          >
            Create a room
          </Link>
        </div>
      </header>

      <div className="px-[18px] pb-3">
        <EventResearchPanel
          token={session}
          query={
            vibe
              ? `${vibe} events and meetups near ${user?.city ?? "here"}`
              : user?.city
                ? `events and meetups near ${user.city}`
                : "events and meetups nearby"
          }
        />
      </div>

      <MapBoard plans={plans} rooms={rooms} events={EVENTS} center={{ lat, lon }} />
      <SectionNav userInitial={user?.first_name?.charAt(0).toUpperCase()} />
    </main>
  );
}
