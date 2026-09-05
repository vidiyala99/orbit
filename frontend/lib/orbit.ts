import { CATEGORIES, type CategoryKey } from "./categories";

export const THEMES = CATEGORIES;
export type ThemeKey = CategoryKey;

export type OrbitLocation = {
  city: string;
  lat: number;
  lon: number;
};

export const LOCATIONS: OrbitLocation[] = [
  { city: "Mountain View, CA", lat: 37.3861, lon: -122.0839 },
  { city: "San Francisco, CA", lat: 37.7749, lon: -122.4194 },
  { city: "Austin, TX", lat: 30.2672, lon: -97.7431 },
  { city: "New York, NY", lat: 40.7128, lon: -74.006 },
  { city: "Seattle, WA", lat: 47.6062, lon: -122.3321 },
  { city: "London, UK", lat: 51.5074, lon: -0.1278 },
];

const LOCATION_KEY = "orbit_location";
const THEME_KEY = "orbit_theme";

export function readOrbitLocation(): OrbitLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OrbitLocation;
    if (typeof parsed.lat !== "number" || typeof parsed.lon !== "number" || !parsed.city) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeOrbitLocation(location: OrbitLocation): void {
  sessionStorage.setItem(LOCATION_KEY, JSON.stringify(location));
}

export function readOrbitTheme(): ThemeKey | null {
  if (typeof window === "undefined") return null;
  const value = sessionStorage.getItem(THEME_KEY);
  return THEMES.some((t) => t.key === value) ? (value as ThemeKey) : null;
}

export function writeOrbitTheme(theme: ThemeKey): void {
  sessionStorage.setItem(THEME_KEY, theme);
}

export function clearOrbitTheme(): void {
  sessionStorage.removeItem(THEME_KEY);
}

export function personStatus(headline: string | null | undefined): string {
  return headline?.trim() || "Nearby";
}
