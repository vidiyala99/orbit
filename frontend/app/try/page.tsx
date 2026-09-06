"use client";
import { useCallback, useEffect, useState } from "react";
import {
  demoLogin,
  fetchNearbyCandidates,
  fetchPeopleAround,
  fetchNearbyPlans,
  fetchNearbyRooms,
  geocodePlace,
} from "@/lib/api";
import { getClientToken, setClientToken } from "@/lib/auth";
import { CATEGORIES } from "@/lib/categories";
import { DEMO_OFFLINE_TOKEN } from "@/lib/demoFixtures";
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
import { MatchCandidateT, NearbyPersonT, PlanT, RoomT } from "@/lib/types";
import CreateRoomField from "@/components/CreateRoomField";
import MapBoard from "@/components/MapBoard";

const RADIUS_M = 5000;

type Step = "location" | "theme" | "board";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong.";
}

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

function nearbyToDots(rows: MatchCandidateT[], origin: OrbitLocation): NearbyPersonT[] {
  return rows.map((row, i) => {
    const angle = (i + 1) * 2.1;
    return {
      user_id: row.user_id,
      first_name: row.first_name,
      last_name: row.last_name,
      status: personStatus(row.headline),
      lat: origin.lat + Math.sin(angle) * 0.0028,
      lon: origin.lon + Math.cos(angle) * 0.0028,
    };
  });
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
  const [boardError, setBoardError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
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

  const loadBoard = useCallback(async (nextLocation: OrbitLocation, nextTheme: ThemeKey) => {
    setLoadingBoard(true);
    setBoardError(null);
    const token = await ensureDemoSession(nextLocation);
    const at = new Date().toISOString();
    const [planResult, roomResult, aroundResult, nearbyResult] = await Promise.allSettled([
      fetchNearbyPlans(nextLocation.lat, nextLocation.lon, RADIUS_M, at, token, nextTheme),
      fetchNearbyRooms(nextLocation.lat, nextLocation.lon, RADIUS_M, token, nextTheme),
      fetchPeopleAround(nextLocation.lat, nextLocation.lon, token, RADIUS_M),
      fetchNearbyCandidates(token),
    ]);

    const nextPlans = settledValue(planResult, [] as PlanT[]);
    const nextRooms = settledValue(roomResult, [] as RoomT[]);
    const around = settledValue(aroundResult, [] as NearbyPersonT[]);
    const nearby = settledValue(nearbyResult, [] as MatchCandidateT[]);
    const nextPeople = around.length > 0 ? around : nearbyToDots(nearby, nextLocation);

    setPlans(nextPlans);
    setRooms(nextRooms);
    setPeople(nextPeople);

    const pinsFailed = planResult.status === "rejected";
    const peopleFailed = aroundResult.status === "rejected" && nearbyResult.status === "rejected";
    if (pinsFailed && peopleFailed) {
      const reason =
        planResult.status === "rejected" ? planResult.reason : aroundResult.status === "rejected" ? aroundResult.reason : nearbyResult;
      setBoardError(errorMessage(reason));
    } else if (pinsFailed || aroundResult.status === "rejected") {
      const reason = pinsFailed && planResult.status === "rejected" ? planResult.reason : aroundResult.status === "rejected" ? aroundResult.reason : null;
      setBoardError(errorMessage(reason ?? "Could not load everything nearby."));
    }
    setLoadingBoard(false);
  }, []);

  useEffect(() => {
    if (step !== "board" || !location || !theme) return;
    let cancelled = false;
    (async () => {
      await loadBoard(location, theme);
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [step, location, theme, reloadTick, loadBoard]);

  async function pickLocation(next: OrbitLocation) {
    setLocating(true);
    setBootError(null);
    try {
      await ensureDemoSession(next);
      writeOrbitLocation(next);
      setLocation(next);
      setStep("theme");
    } catch (err) {
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
    } catch (err) {
      setBootError(errorMessage(err));
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
    } catch (err) {
      setBootError(errorMessage(err));
      setLocating(false);
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
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-ground px-6 py-8 sm:px-8 sm:py-10">
        <p className="text-[13px] font-semibold text-ink3">Orbit</p>
        <h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.35px] text-ink">
          Pick a location
        </h1>
        <p className="mt-2 text-[14px] font-medium text-ink2">Where should we look?</p>
        <ul className="mt-6 grid grid-cols-1 gap-2">
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
        <form onSubmit={handleCustom} className="mt-6">
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
          <div className="mt-4 rounded-card bg-surface px-4 py-3 shadow-card" role="alert">
            <p className="text-[12px] font-semibold text-accent">{bootError}</p>
            <button
              type="button"
              onClick={() => setBootError(null)}
              className="mt-2 text-[12px] font-bold text-ink"
            >
              Retry
            </button>
          </div>
        )}
      </main>
    );
  }

  if (step === "theme") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-ground px-6 py-8 sm:px-8 sm:py-10">
        <p className="text-[13px] font-semibold text-ink3">Orbit</p>
        <h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.35px] text-ink">
          Pick a theme
        </h1>
        <p className="mt-2 text-[14px] font-medium text-ink2">
          {location?.city ?? "Nearby"}
        </p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <li key={category.key}>
              <button
                type="button"
                onClick={() => pickTheme(category.key)}
                className="lift btn-press rounded-full bg-surface px-4 py-2.5 text-[15px] font-bold text-ink shadow-card hover:shadow-card-hover"
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

  return (
    <main className="flex min-h-screen flex-col bg-ground">
      <header className="flex items-center justify-between gap-3 border-b border-rule bg-ground px-6 py-3">
        <div>
          <h1 className="text-[16px] font-extrabold tracking-[-0.2px] text-ink">
            {themeLabel} in {location?.city}
          </h1>
          <p className="text-[11px] font-medium text-ink3">
            {loadingBoard ? "Pinning…" : "Pins for events and people nearby"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              clearOrbitTheme();
              setTheme(null);
              setStep("theme");
            }}
            className="btn-press rounded-full border border-rule bg-surface px-3 py-1 text-[11px] font-semibold text-ink"
          >
            Theme
          </button>
          <button
            type="button"
            onClick={() => {
              clearOrbitTheme();
              setTheme(null);
              setStep("location");
            }}
            className="btn-press rounded-full border border-rule bg-surface px-3 py-1 text-[11px] font-semibold text-ink"
          >
            Place
          </button>
        </div>
      </header>

      {boardError && (
        <div className="border-b border-rule bg-surface px-6 py-3" role="alert">
          <p className="text-[12px] font-semibold text-accent">{boardError}</p>
          <button
            type="button"
            onClick={() => setReloadTick((n) => n + 1)}
            className="mt-2 text-[12px] font-bold text-ink"
          >
            Retry
          </button>
        </div>
      )}

      {location && (
        <section aria-label="Map" className="relative min-h-[70vh] flex-1">
          <h2 className="sr-only">Map</h2>
          <MapBoard
            plans={plans}
            rooms={rooms}
            events={[]}
            people={people}
            center={{ lat: location.lat, lon: location.lon }}
            compact
          />
        </section>
      )}

      {location && (
        <div className="border-t border-rule bg-ground px-6 py-3">
          <CreateRoomField lat={location.lat} lon={location.lon} />
        </div>
      )}
    </main>
  );
}
