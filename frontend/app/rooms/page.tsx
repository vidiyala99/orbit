import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchNearbyRooms } from "@/lib/api";
import { requireOnboarded } from "@/lib/requireOnboarded";
import SectionNav from "@/components/SectionNav";
import RoomsBrowser from "@/components/RoomsBrowser";

const FALLBACK_LAT = 37.3861;
const FALLBACK_LON = -122.0839;
const RADIUS_M = 5000;

export default async function RoomsPage() {
  // Unlike /today, rooms aren't public — private rooms are scoped to the caller,
  // so there's nothing meaningful to show a signed-out visitor.
  const token = (await cookies()).get("sc_token")?.value;
  if (!token) redirect("/sign-in");

  const user = await requireOnboarded();
  const lat = user?.lat ?? FALLBACK_LAT;
  const lon = user?.lon ?? FALLBACK_LON;
  const rooms = await fetchNearbyRooms(lat, lon, RADIUS_M, token);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-ground pb-28 md:max-w-6xl md:pb-10 md:pt-16">
      <header className="px-[18px] pb-1 pt-5">
        <h1 className="text-[23px] font-extrabold leading-tight tracking-[-0.3px] text-ink">
          {user?.first_name ? `Hey, ${user.first_name}` : "Rooms"}
        </h1>
        <p className="mt-[3px] text-xs font-medium text-ink3">
          Rooms near you{user?.city ? ` · ${user.city}` : ""}
        </p>
      </header>

      <RoomsBrowser initialRooms={rooms} />
      <SectionNav userInitial={user?.first_name?.charAt(0).toUpperCase()} />
    </main>
  );
}
