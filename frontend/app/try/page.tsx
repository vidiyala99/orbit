"use client";
import { useEffect, useState } from "react";
import {
  demoLogin,
  fetchNearbyCandidates,
  fetchNearbyPlans,
  fetchNearbyRooms,
  togglePresenceOn,
} from "@/lib/api";
import { getClientToken, setClientToken } from "@/lib/auth";
import { CATEGORIES } from "@/lib/categories";
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
import { MatchCandidateT, PlanT, RoomT } from "@/lib/types";
import PlanCard from "@/components/PlanCard";
import RoomsBrowser from "@/components/RoomsBrowser";

const RADIUS_M = 5000;

type Step = "location" | "theme" | "board";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong.";
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
  const [people, setPeople] = useState<MatchCandidateT[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!getClientToken()) {
          const { access_token } = await demoLogin();
          setClientToken(access_token);
        }
        if (cancelled) return;
        const savedLocation = readOrbitLocation();
        const savedTheme = readOrbitTheme();
        if (savedLocation) setLocation(savedLocation);
        if (savedTheme) setTheme(savedTheme);
        if (savedLocation && savedTheme) setStep("board");
        else if (savedLocation) setStep("theme");
        else setStep("location");
      } catch (err) {
        if (!cancelled) setBootError(errorMessage(err));
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (step !== "board" || !location || !theme) return;
    const token = getClientToken();
    if (!token) return;
    let cancelled = false;
    setLoadingBoard(true);
    setBoardError(null);
    (async () => {
      try {
        const at = new Date().toISOString();
        const [nextPlans, nextRooms] = await Promise.all([
          fetchNearbyPlans(location.lat, location.lon, RADIUS_M, at, token, theme),
          fetchNearbyRooms(location.lat, location.lon, RADIUS_M, token, theme),
        ]);
        if (cancelled) return;
        setPlans(nextPlans);
        setRooms(nextRooms);
        await togglePresenceOn(location.lat, location.lon, token);
        const nearby = await fetchNearbyCandidates(token);
        if (!cancelled) setPeople(nearby);
      } catch (err) {
        if (!cancelled) setBoardError(errorMessage(err));
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
      const { access_token } = await demoLogin(next);
      setClientToken(access_token);
      writeOrbitLocation(next);
      setLocation(next);
      setStep("theme");
    } catch (err) {
      setBootError(errorMessage(err));
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

  if (bootError && step === "location" && !location) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-ground px-6">
        <p className="text-sm font-semibold text-accent" role="alert">
          {bootError}
        </p>
      </main>
    );
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
        <button
          type="button"
          disabled={locating}
          onClick={useMyLocation}
          className="mt-4 text-center text-[13px] font-semibold text-accent"
        >
          {locating ? "Pinning…" : "Use my location"}
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

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-ground pb-28 md:max-w-3xl">
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

      {boardError && (
        <p className="px-[18px] pt-3 text-[12px] font-semibold text-accent" role="alert">
          {boardError}
        </p>
      )}

      <section className="mt-6 px-[18px]">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.04em] text-ink3">
          Nearby events
        </h2>
        {loadingBoard && plans.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink2">Looking around…</p>
        ) : plans.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink2">No events in this theme yet.</p>
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
        {people.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink2">
            {loadingBoard ? "Finding people…" : "No one else nearby right now."}
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2.5">
            {people.map((person) => (
              <li key={person.user_id} className="rounded-card bg-surface p-4 shadow-card">
                <p className="text-[14px] font-semibold text-ink">
                  {person.first_name ?? "Someone"} {person.last_name ?? ""}
                </p>
                <p className="mt-0.5 text-[13px] font-medium text-ink2">
                  {personStatus(person.headline)}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-accent">
                  <span className="live-dot" aria-hidden="true" />
                  HERE NOW
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="px-[18px] text-[13px] font-bold uppercase tracking-[0.04em] text-ink3">
          Rooms
        </h2>
        <RoomsBrowser initialRooms={rooms} />
      </section>
    </main>
  );
}
