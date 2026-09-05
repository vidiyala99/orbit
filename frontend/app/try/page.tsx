"use client";
import { useEffect, useState } from "react";
import {
  demoLogin,
  fetchPeopleAround,
  fetchNearbyPlans,
  fetchNearbyRooms,
  geocodePlace,
} from "@/lib/api";
import { getClientToken, setClientToken } from "@/lib/auth";
import { CATEGORIES } from "@/lib/categories";
import {
  DEMO_OFFLINE_TOKEN,
  fixturePeople,
  fixturePlans,
  fixtureRooms,
  orFixtures,
} from "@/lib/demoFixtures";
import {
  LOCATIONS,
  clearOrbitTheme,
  personStatus,
  readOrbitLocation,
  readOrbitTheme,
  writeOrbitLocation,
  writeOrbitTheme,
  type OrbitLocation,
  type ThemeKey,
} from "@/lib/orbit";
import { NearbyPersonT, PlanT, RoomT } from "@/lib/types";
import PlanCard from "@/components/PlanCard";
import RoomsBrowser from "@/components/RoomsBrowser";
import CreateRoomField from "@/components/CreateRoomField";
import MapBoard, { type MapEventT } from "@/components/MapBoard";

const RADIUS_M = 5000;

type Step = "location" | "theme" | "board";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong.";
}

async function ensureDemoSession(location?: OrbitLocation): Promise<string> {
  const existing = getClientToken();
  if (existing && existing !== DEMO_OFFLINE_TOKEN && !location) return existing;
  try {
    const { access_token } = await demoLogin(location);
    setClientToken(access_token);
    return access_token;
  } catch {
    if (!getClientToken()) setClientToken(DEMO_OFFLINE_TOKEN);
    return getClientToken() ?? DEMO_OFFLINE_TOKEN;
  }
}

export default function TryPage() {
  const [step, setStep] = useState<Step>("location");
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [location, setLocation] = useState<OrbitLocation | null>(null);
  const [theme, setTheme] = useState<ThemeKey | null>(null);
  const [locating, setLocating] = useState(false);

  const [plans, setPlans] = useState<PlanT[]>([]);
  const [rooms, setRooms] = useState<RoomT[]>([]);
  const [people, setPeople] = useState<NearbyPersonT[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [custom, setCustom] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureDemoSession();
      if (cancelled) return;
      const savedLocation = readOrbitLocation();
      const savedTheme = readOrbitTheme();
      if (savedLocation) setLocation(savedLocation);
      if (savedTheme) setTheme(savedTheme);
      if (savedLocation && savedTheme) setStep("board");
      else if (savedLocation) setStep("theme");
      else setStep("location");
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (step !== "board" || !location || !theme) return;
    let cancelled = false;
    setLoadingBoard(true);
    (async () => {
      const token = await ensureDemoSession(location);
      const fallbackPeople = fixturePeople(location);
      const fallbackPlans = fixturePlans(location, theme);
      const fallbackRooms = fixtureRooms(location);
      try {
        const at = new Date().toISOString();
        const [nextPlans, nextRooms, nearby] = await Promise.all([
          fetchNearbyPlans(location.lat, location.lon, RADIUS_M, at, token, theme),
          fetchNearbyRooms(location.lat, location.lon, RADIUS_M, token, theme),
          fetchPeopleAround(location.lat, location.lon, token, RADIUS_M),
        ]);
        if (cancelled) return;
        setPlans(orFixtures(nextPlans, fallbackPlans));
        setRooms(orFixtures(nextRooms, fallbackRooms));
        setPeople(orFixtures(nearby, fallbackPeople));
      } catch {
        if (cancelled) return;
        setPlans(fallbackPlans);
        setRooms(fallbackRooms);
        setPeople(fallbackPeople);
      } finally {
        if (!cancelled) setLoadingBoard(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, location, theme]);

  async function pickLocation(next: OrbitLocation) {
    setLocating(true);
    setBootError(null);
    try {
      await ensureDemoSession(next);
      writeOrbitLocation(next);
      setLocation(next);
      setStep("theme");
    } catch (err) {
      writeOrbitLocation(next);
      setLocation(next);
      setStep("theme");
      setBootError(errorMessage(err));
    } finally {
      setLocating(false);
    }
  }

  async function handleCustom(e: React.FormEvent) {
    e.preventDefault();
    const q = custom.trim();
    if (!q) return;
    setLocating(true);
    setBootError(null);
    try {
      const token = await ensureDemoSession();
      const found = await geocodePlace(q, token);
      await pickLocation({ city: found.city, lat: found.lat, lon: found.lon });
    } catch {
      await pickLocation({ city: q, lat: LOCATIONS[0].lat, lon: LOCATIONS[0].lon });
    } finally {
      setLocating(false);
    }
  }

  async function useMyLocation() {
    setLocating(true);
    setBootError(null);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject),
      );
      await pickLocation({
        city: "Near you",
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      });
    } catch {
      await pickLocation(LOCATIONS[0]);
    }
  }

  function pickTheme(next: ThemeKey) {
    writeOrbitTheme(next);
    setTheme(next);
    setStep("board");
  }

  if (!ready) {
    return <main className="min-h-screen bg-ground" />;
  }

  if (step === "location") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-ground px-[18px] py-10">
        <p className="text-[13px] font-semibold text-ink3">Orbit</p>
        <h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.35px] text-ink">
          Pick a location
        </h1>
        <p className="mt-2 text-[14px] font-medium text-ink2">Where should we look?</p>
        <ul className="mt-6 grid grid-cols-1 gap-2.5">
          {LOCATIONS.map((item) => (
            <li key={item.city}>
              <button
                type="button"
                disabled={locating}
                onClick={() => pickLocation(item)}
                className="lift btn-press w-full rounded-card bg-surface px-4 py-3.5 text-left text-[15px] font-bold text-ink shadow-card hover:shadow-card-hover disabled:opacity-60"
              >
                {item.city}
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={handleCustom} className="mt-5">
          <label htmlFor="custom-place" className="text-[11px] font-bold text-ink3">
            Neighborhood or city
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              id="custom-place"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Castro, Mountain View"
              className="field min-w-0 flex-1 rounded-field border border-rule bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink3"
            />
            <button
              type="submit"
              disabled={!custom.trim() || locating}
              className="btn-press rounded-full bg-ink px-4 text-[13px] font-bold text-ground disabled:opacity-50"
            >
              Go
            </button>
          </div>
        </form>
        <button
          type="button"
          disabled={locating}
          onClick={useMyLocation}
          className="mt-4 text-center text-[13px] font-semibold text-accent"
        >
          {locating ? "Pinning…" : "Use my pin"}
        </button>
        {bootError && (
          <p className="mt-3 text-[12px] font-semibold text-accent" role="alert">
            {bootError}
          </p>
        )}
      </main>
    );
  }

  if (step === "theme") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-ground px-[18px] py-10">
        <p className="text-[13px] font-semibold text-ink3">Orbit</p>
        <h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.35px] text-ink">
          Pick a theme
        </h1>
        <p className="mt-2 text-[14px] font-medium text-ink2">
          {location?.city ?? "Nearby"}
        </p>
        <ul className="mt-6 grid grid-cols-2 gap-2.5">
          {CATEGORIES.map((category) => (
            <li key={category.key}>
              <button
                type="button"
                onClick={() => pickTheme(category.key)}
                className="lift btn-press flex h-[72px] w-full items-center justify-center rounded-card bg-surface text-[16px] font-bold text-ink shadow-card hover:shadow-card-hover"
              >
                {category.label}
              </button>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  const themeLabel = CATEGORIES.find((c) => c.key === theme)?.label ?? "Nearby";
  const mapEvents: MapEventT[] = plans
    .filter((p) => p.activity === "event")
    .map((p) => ({
      id: p.id,
      title: p.detail || p.text,
      lat: p.lat,
      lon: p.lon,
      meta: p.detail || p.text,
    }));

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-ground pb-28 md:max-w-6xl">
      <header className="px-[18px] pt-6">
        <p className="text-[13px] font-semibold text-ink3">Orbit</p>
        <h1 className="mt-1 text-[23px] font-extrabold tracking-[-0.3px] text-ink">
          {themeLabel} in {location?.city}
        </h1>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => {
              clearOrbitTheme();
              setTheme(null);
              setStep("theme");
            }}
            className="btn-press rounded-full border border-rule bg-surface px-3 py-1.5 text-[12px] font-semibold text-ink"
          >
            Change theme
          </button>
          <button
            type="button"
            onClick={() => {
              clearOrbitTheme();
              setTheme(null);
              setStep("location");
            }}
            className="btn-press rounded-full border border-rule bg-surface px-3 py-1.5 text-[12px] font-semibold text-ink"
          >
            Change location
          </button>
        </div>
      </header>

      {location && (
        <section className="mt-5" aria-label="Map">
          <h2 className="px-[18px] text-[13px] font-bold uppercase tracking-[0.04em] text-ink3">
            Map
          </h2>
          <div className="mt-3">
            <MapBoard
              plans={plans}
              rooms={rooms}
              events={mapEvents}
              center={{ lat: location.lat, lon: location.lon }}
            />
          </div>
        </section>
      )}

      <section className="mt-6 px-[18px]">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.04em] text-ink3">
          Nearby events
        </h2>
        {loadingBoard && plans.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink2">Looking around…</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 px-[18px]">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.04em] text-ink3">
          People nearby
        </h2>
        <ul className="mt-3 flex flex-col gap-2.5">
          {people.map((person) => (
            <li key={person.user_id} className="rounded-card bg-surface p-4 shadow-card">
              <p className="text-[14px] font-semibold text-ink">
                {person.first_name ?? "Someone"} {person.last_name ?? ""}
              </p>
              <p className="mt-1 inline-flex rounded-full bg-accent-soft px-2.5 py-1 text-[12px] font-bold text-accent">
                {personStatus(person.status)}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-accent">
                <span className="live-dot" aria-hidden="true" />
                HERE NOW
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="px-[18px] text-[13px] font-bold uppercase tracking-[0.04em] text-ink3">
          Rooms
        </h2>
        {location && (
          <div className="mt-3 px-[18px]">
            <CreateRoomField lat={location.lat} lon={location.lon} />
          </div>
        )}
        <RoomsBrowser initialRooms={rooms} />
      </section>
    </main>
  );
}
