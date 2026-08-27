"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { calendarConnectUrl, fetchEventCandidates } from "@/lib/api";
import { EventCandidateT } from "@/lib/types";

const DISMISSED_KEY = "sc_calendar_ribbon_dismissed";
const SKIPPED_KEY = "sc_calendar_skipped";
const PREFILL_KEY = "sc_calendar_prefill";

/** Source+title+start is stable enough to identify one candidate across a
 *  session without the backend having to hand us an id. */
function candidateId(c: EventCandidateT): string {
  return `${c.source}-${c.title}-${c.starts_at ?? ""}`;
}

function readSkipped(): string[] {
  try {
    const raw = sessionStorage.getItem(SKIPPED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Gmail-sourced candidates have no time or location at all, so their row is
 *  just the source tag. */
function metaLine(c: EventCandidateT): string {
  const parts: string[] = [];
  if (c.starts_at && c.ends_at) parts.push(`${formatTime(c.starts_at)}–${formatTime(c.ends_at)}`);
  if (c.location) parts.push(c.location);
  return parts.join(" · ");
}

export default function CalendarEventBanner({
  token,
  googleCalendarConnected,
}: {
  token: string;
  googleCalendarConnected: boolean;
}) {
  const router = useRouter();
  const [ribbonHidden, setRibbonHidden] = useState(true);
  const [candidates, setCandidates] = useState<EventCandidateT[]>([]);

  useEffect(() => {
    if (googleCalendarConnected) return;
    setRibbonHidden(sessionStorage.getItem(DISMISSED_KEY) === "1");
  }, [googleCalendarConnected]);

  useEffect(() => {
    if (!googleCalendarConnected) return;
    let cancelled = false;

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    // Any failure here — network, revoked grant, malformed payload — is just
    // "nothing to pin today". This banner must never break /today.
    fetchEventCandidates(start.toISOString(), end.toISOString(), token)
      .then((res) => {
        if (cancelled || !Array.isArray(res.candidates)) return;
        const skipped = readSkipped();
        setCandidates(res.candidates.filter((c) => !skipped.includes(candidateId(c))));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [googleCalendarConnected, token]);

  if (!googleCalendarConnected) {
    if (ribbonHidden) return null;
    return (
      <div className="mx-[18px] mb-3.5 flex items-center justify-between gap-2.5 rounded-xl bg-accent-soft px-3.5 py-[11px]">
        <p className="text-xs font-medium leading-snug text-ink2">
          Connect Google Calendar to auto-fill plans for events you&apos;re attending.
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => {
              window.location.href = calendarConnectUrl(token);
            }}
            className="btn-press rounded-full bg-surface px-3 py-1.5 text-[11.5px] font-semibold text-ink transition-shadow hover:shadow-card"
          >
            Connect
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => {
              sessionStorage.setItem(DISMISSED_KEY, "1");
              setRibbonHidden(true);
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full text-sm leading-none text-ink3 transition-colors hover:bg-white/60 hover:text-ink"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  if (candidates.length === 0) return null;
  const single = candidates.length === 1;

  function skipAll() {
    const skipped = readSkipped();
    for (const c of candidates) skipped.push(candidateId(c));
    sessionStorage.setItem(SKIPPED_KEY, JSON.stringify(skipped));
    setCandidates([]);
  }

  function pin(c: EventCandidateT) {
    sessionStorage.setItem(PREFILL_KEY, JSON.stringify(c));
    router.push("/post");
  }

  return (
    <div className="mx-[18px] mb-3">
      <div className="rounded-card bg-surface p-4 shadow-card">
        <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-ink3">
          On your radar today
        </p>
        <p className="mt-1 text-[15px] font-bold text-ink">
          {single ? candidates[0].title : "Pick one to pin"}
        </p>

        {candidates.map((c) => (
          <div
            key={candidateId(c)}
            className={`flex items-center justify-between gap-3 py-2 ${
              single ? "" : "mt-2 border-t border-rule pt-2.5"
            }`}
          >
            <div className="min-w-0">
              {!single && <p className="truncate text-[13px] font-semibold text-ink">{c.title}</p>}
              <p className="flex items-center gap-1.5 text-[11px] text-ink2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em] ${
                    c.source === "calendar" ? "bg-rule/60 text-ink2" : "bg-accent-soft text-accent"
                  }`}
                >
                  {c.source === "calendar" ? "Calendar" : "Inbox"}
                </span>
                <span className="truncate font-mono">{metaLine(c)}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => pin(c)}
              className="lift btn-press shrink-0 whitespace-nowrap rounded-full bg-ink px-3.5 py-1.5 text-xs font-bold text-ground shadow-raised hover:shadow-raised-hover"
            >
              Pin this →
            </button>
          </div>
        ))}

        <div className="pt-1 text-right">
          <button
            type="button"
            onClick={skipAll}
            className="rounded-full text-[11px] font-medium text-ink3 transition-colors hover:text-ink"
          >
            {single ? "Not going / skip" : "Not seeing your plans, dismiss for today"}
          </button>
        </div>
      </div>
    </div>
  );
}
