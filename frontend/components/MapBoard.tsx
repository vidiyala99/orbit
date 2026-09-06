"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { NearbyPersonT, PlanT, RoomT } from "@/lib/types";
import { memberLabel } from "@/lib/rooms";

/** There is no events data source yet (that's the unbuilt Luma integration), so
 *  the map takes an events array that is always empty for now. Wiring it later
 *  is a matter of passing real rows in — the pin, filter and list paths already
 *  handle the `event` kind. */
export type MapEventT = {
  id: string;
  title: string;
  lat: number | null;
  lon: number | null;
  meta: string;
};

type KindT = "plan" | "event" | "room" | "person";

type MarkerT = {
  key: string;
  kind: KindT;
  id: string;
  title: string;
  meta: string;
  glyph: string;
  lat: number | null;
  lon: number | null;
  activity?: string;
};

function activityLabel(activity: string): string {
  return activity
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const BASE_FILTERS: { kind: KindT; label: string }[] = [
  { kind: "plan", label: "Plans" },
  { kind: "event", label: "Events" },
  { kind: "room", label: "Rooms" },
];

const DOT_CLASS: Record<KindT, string> = {
  plan: "bg-accent text-white",
  event: "bg-ink3 text-white",
  room: "bg-ink text-ground",
  person: "bg-accent text-white",
};

const GLYPH: Record<KindT, string> = { plan: "☕", event: "★", room: "▦", person: "●" };

/** Events have no page of their own yet (no data source either), so only plans
 *  and rooms get an action on the detail card. */
function markerHref(marker: MarkerT): string | null {
  if (marker.kind === "plan") return `/plans/${marker.id}`;
  if (marker.kind === "room") return `/rooms/${marker.id}`;
  return null;
}

/** Half-height of the schematic map in degrees of latitude — roughly the 5km
 *  discovery radius, so a plan at the edge of the radius lands near the edge of
 *  the canvas. */
const LAT_HALF_SPAN = 5000 / 111_320;

/** Projects a coordinate into percentage offsets on the canvas, clamped so a
 *  far-away pin still renders on-screen instead of being clipped away. */
export function project(
  lat: number,
  lon: number,
  center: { lat: number; lon: number },
): { left: number; top: number } {
  const lonHalfSpan = LAT_HALF_SPAN / Math.max(Math.cos((center.lat * Math.PI) / 180), 0.01);
  const clamp = (v: number) => Math.min(94, Math.max(6, v));
  return {
    left: clamp(50 + ((lon - center.lon) / (2 * lonHalfSpan)) * 100),
    top: clamp(50 - ((lat - center.lat) / (2 * LAT_HALF_SPAN)) * 100),
  };
}

function minutesLeft(endsAt: string): string {
  const mins = Math.round((new Date(endsAt).getTime() - Date.now()) / 60000);
  return mins > 0 ? `${mins} min left` : "wrapping up";
}

function personName(person: NearbyPersonT): string {
  return [person.first_name, person.last_name].filter(Boolean).join(" ") || "Someone";
}

function toMarkers(
  plans: PlanT[],
  rooms: RoomT[],
  events: MapEventT[],
  people: NearbyPersonT[],
  compact: boolean,
): MarkerT[] {
  return [
    ...plans.map((p) => ({
      key: `plan-${p.id}`,
      kind: "plan" as const,
      id: p.id,
      title: compact ? p.detail || p.text : p.text,
      meta: compact ? minutesLeft(p.ends_at) : `Plan · ${minutesLeft(p.ends_at)}`,
      glyph: GLYPH.plan,
      lat: p.lat,
      lon: p.lon,
      activity: p.activity ? activityLabel(p.activity) : undefined,
    })),
    ...events.map((e) => ({
      key: `event-${e.id}`,
      kind: "event" as const,
      id: e.id,
      title: e.title,
      meta: compact ? e.meta : `Event · ${e.meta}`,
      glyph: GLYPH.event,
      lat: e.lat,
      lon: e.lon,
    })),
    ...rooms.map((r) => ({
      key: `room-${r.id}`,
      kind: "room" as const,
      id: r.id,
      title: r.name,
      meta: compact
        ? memberLabel(r.member_count)
        : `Room · ${r.visibility === "public" ? "Public" : "Private"} · ${memberLabel(r.member_count)}`,
      glyph: GLYPH.room,
      lat: r.lat,
      lon: r.lon,
    })),
    ...people.map((p) => ({
      key: `person-${p.user_id}`,
      kind: "person" as const,
      id: p.user_id,
      title: personName(p),
      meta: p.status,
      glyph: GLYPH.person,
      lat: p.lat,
      lon: p.lon,
    })),
  ];
}

export default function MapBoard({
  plans,
  rooms,
  events,
  people = [],
  center,
  compact = false,
}: {
  plans: PlanT[];
  rooms: RoomT[];
  events: MapEventT[];
  people?: NearbyPersonT[];
  center: { lat: number; lon: number };
  compact?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hidden, setHidden] = useState<KindT[]>([]);
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});

  const allMarkers = toMarkers(plans, rooms, events, people, compact);
  const presentKinds = new Set(allMarkers.map((m) => m.kind));
  const filters = [
    ...BASE_FILTERS,
    ...(people.length ? [{ kind: "person" as const, label: "People" }] : []),
  ].filter((f) => !compact || presentKinds.has(f.kind));
  const markers = allMarkers.filter((m) => !hidden.includes(m.kind));
  // Filtering out the selected marker's kind should take its card with it.
  const detail = markers.find((m) => m.key === selected) ?? null;
  const detailHref = detail ? markerHref(detail) : null;

  useEffect(() => {
    if (selected) itemRefs.current[selected]?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  function toggleFilter(kind: KindT) {
    setHidden((current) =>
      current.includes(kind) ? current.filter((k) => k !== kind) : [...current, kind],
    );
  }

  return (
    /* Narrow screens stack: map card, then the list under it. From `md` up the
       same two pieces become a fixed sidebar and a map that takes the rest of
       the width — order is flipped with `order-*` so neither is duplicated. */
    <div
      data-testid="map-split"
      className={
        compact
          ? "absolute inset-0"
          : "flex flex-1 flex-col md:grid md:grid-cols-[290px_minmax(0,1fr)] md:items-start md:gap-4 md:px-[18px]"
      }
    >
      {/* Compact /try is full-bleed pins. The signed-in /map board stays a
          paper card with a list beside it. */}
      <div className={compact ? "absolute inset-0" : "order-1 mb-1 shrink-0 px-[18px] md:order-2 md:mb-0 md:px-0"}>
        <div
          className={
            compact
              ? "relative h-full overflow-hidden bg-ground"
              : "relative h-[250px] overflow-hidden rounded-card bg-surface shadow-card md:h-[70vh]"
          }
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 [background-image:repeating-linear-gradient(0deg,transparent,transparent_46px,rgba(124,139,110,0.16)_46px,rgba(124,139,110,0.16)_47px),repeating-linear-gradient(90deg,transparent,transparent_64px,rgba(124,139,110,0.16)_64px,rgba(124,139,110,0.16)_65px)]"
          />
          <div
            aria-hidden="true"
            className="absolute left-5 top-5 h-[50px] w-[80px] rounded-[6px] bg-ground"
          />
          <div
            aria-hidden="true"
            className="absolute left-[140px] top-[95px] h-[70px] w-[70px] rounded-[6px] bg-ground"
          />
          <div
            aria-hidden="true"
            className="absolute left-10 top-[180px] h-[55px] w-[90px] rounded-[6px] bg-ground"
          />

          <div className="absolute left-2.5 top-2.5 z-10 flex max-w-[calc(100%-20px)] flex-wrap gap-1.5">
            {filters.map((f) => {
              const on = !hidden.includes(f.kind);
              return (
                <button
                  key={f.kind}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleFilter(f.kind)}
                  className={`btn-press rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors duration-150 ${
                    on
                      ? "border-accent bg-accent text-white"
                      : "border-rule bg-surface text-ink2 hover:border-accent hover:bg-accent-soft"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* "You are here" — a plain ringed disc. Every other marker is a
              teardrop with a glyph, so this can never be misread as one. */}
          <span
            data-testid="pin-you"
            aria-hidden="true"
            className="absolute z-[1] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface ring-[3px] ring-accent"
            style={{ left: "50%", top: "50%" }}
          />

          {markers.map((m) => {
            if (m.lat === null || m.lon === null) return null;
            const { left, top } = project(m.lat, m.lon, center);
            const on = selected === m.key;
            return (
              <button
                key={m.key}
                type="button"
                data-testid={`pin-${m.key}`}
                aria-current={on}
                aria-label={m.activity ? `${m.title}, ${m.activity}` : m.title}
                onClick={() => setSelected(m.key)}
                className={`absolute -translate-x-1/2 -translate-y-full transition-transform duration-200 ease-out ${
                  on ? "z-10 scale-[1.3]" : "hover:scale-110"
                }`}
                style={{ left: `${left}%`, top: `${top}%`, transformOrigin: "bottom center" }}
              >
                <span
                  className={`flex h-[24px] w-[24px] -rotate-45 items-center justify-center rounded-full rounded-bl-none text-[11px] shadow-card ring-2 ring-surface ${
                    DOT_CLASS[m.kind]
                  }`}
                >
                  <span className="rotate-45" aria-hidden="true">
                    {m.glyph}
                  </span>
                </span>
              </button>
            );
          })}

          {/* Desktop only: on narrow screens the list underneath already sits
              right below the map and scrolls the selection into view. */}
          {detail && (
            <div
              data-testid="map-detail"
              className={`absolute z-20 w-[230px] rounded-card bg-surface p-3 shadow-raised ${
                compact ? "bottom-3 left-3 right-3 w-auto md:bottom-auto md:left-auto md:right-3 md:top-3 md:w-[230px]" : "right-3 top-3 hidden md:block"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 text-[13.5px] font-bold leading-snug text-ink">
                  {detail.title}
                </span>
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => setSelected(null)}
                  className="btn-press -mr-1 -mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm leading-none text-ink3 transition-colors hover:bg-accent-soft hover:text-ink"
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>
              <p className="mt-1 font-mono text-[10.5px] text-ink3">{detail.meta}</p>
              {detail.activity && (
                <p data-testid="pin-activity" className="mt-1 text-[12px] font-bold text-accent">
                  {detail.activity}
                </p>
              )}
              {detailHref && (
                <Link
                  href={detailHref}
                  className="btn-press mt-2.5 block rounded-full bg-ink py-2 text-center text-[12px] font-bold text-ground"
                >
                  {detail.kind === "room" ? "Open room" : "See plan"}
                </Link>
              )}
            </div>
          )}

          {compact && markers.length === 0 && (
            <div
              data-testid="map-empty"
              className="absolute inset-0 z-[5] flex items-center justify-center px-6"
            >
              <p className="rounded-card bg-surface px-4 py-3 text-center text-[13px] font-medium text-ink2 shadow-card">
                Nothing pinned near you yet.
              </p>
            </div>
          )}
        </div>
      </div>

      {!compact && (
        <div
          data-testid="nearby-list"
          className="order-2 flex-1 px-[18px] pb-4 pt-4 md:order-1 md:max-h-[70vh] md:overflow-y-auto md:px-0 md:pt-0"
        >
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.04em] text-ink3">
            What&apos;s happening now
          </p>
          {markers.length === 0 ? (
            <p className="text-[13px] text-ink2">Nothing pinned near you yet.</p>
          ) : (
            markers.map((m) => {
              const on = selected === m.key;
              return (
                <div
                  key={m.key}
                  ref={(el) => {
                    itemRefs.current[m.key] = el;
                  }}
                  data-testid={`item-${m.key}`}
                  aria-current={on}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(m.key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSelected(m.key);
                  }}
                  className={`lift btn-press mb-3 flex cursor-pointer items-center gap-3 rounded-card bg-surface p-4 transition-shadow ${
                    on ? "shadow-card-hover ring-1 ring-accent" : "shadow-card hover:shadow-card-hover"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${
                      DOT_CLASS[m.kind]
                    }`}
                  >
                    {m.glyph}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold text-ink">
                      {m.title}
                    </span>
                    <span className="mt-0.5 block font-mono text-[10.5px] text-ink3">{m.meta}</span>
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
