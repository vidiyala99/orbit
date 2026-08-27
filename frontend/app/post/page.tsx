"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPlan } from "@/lib/api";
import { getClientToken } from "@/lib/auth";
import SectionNav from "@/components/SectionNav";
import { EventCandidateT } from "@/lib/types";

const ACTIVITY_FRAGMENTS: Record<string, string> = {
  coffee: "Grabbing coffee",
  ride_share: "Heading out, ride share",
  cowork: "Working from a spot nearby",
  meal: "Grabbing food",
  other: "Making plans",
  event: "Heading to an event",
};

const OPENNESS_FRAGMENTS: Record<string, string> = {
  heads_down: "heads down, but say hi",
  open_to_chat: "open to chat",
  actively_meeting: "actively looking to meet people",
};

const ACTIVITIES: { key: string; label: string }[] = [
  { key: "coffee", label: "Coffee" },
  { key: "ride_share", label: "Ride share" },
  { key: "cowork", label: "Cowork" },
  { key: "meal", label: "Meal" },
  { key: "other", label: "Something else" },
  { key: "event", label: "Event" },
];

const OPENNESSES: { key: string; label: string }[] = [
  { key: "heads_down", label: "Heads down, say hi anyway" },
  { key: "open_to_chat", label: "Open to chat" },
  { key: "actively_meeting", label: "Actively looking to meet people" },
];

const DURATIONS: { minutes: number; label: string }[] = [
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 hour" },
  { minutes: 120, label: "2 hours" },
  { minutes: 240, label: "4 hours" },
];

function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round((minutes / 60) * 2) / 2;
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

const PREFILL_KEY = "sc_calendar_prefill";

type PrefillT = EventCandidateT;

/** Reads and *consumes* the calendar handoff, so a later plain visit to /post
 *  doesn't re-apply a stale event. */
function takePrefill(): PrefillT | null {
  try {
    const raw = sessionStorage.getItem(PREFILL_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PREFILL_KEY);
    const parsed = JSON.parse(raw);
    if (typeof parsed?.title !== "string") return null;
    return parsed as PrefillT;
  } catch {
    return null;
  }
}

function closestDuration(startsAt: string, endsAt: string): number {
  const spanMinutes = (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000;
  return DURATIONS.reduce((best, d) =>
    Math.abs(d.minutes - spanMinutes) < Math.abs(best.minutes - spanMinutes) ? d : best,
  ).minutes;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return "Could not post plan";
}

const CHIP =
  "btn-press rounded-full border px-[15px] py-[9px] text-[12.5px] font-semibold transition-colors duration-150";
const CHIP_ON = "border-accent bg-accent text-white";
const CHIP_OFF = "border-rule bg-surface text-ink hover:border-accent hover:bg-accent-soft";

/** The numbered step label from the mockup: a soft accent disc plus a small
 *  bold caption, used as the legend of each fieldset. */
function StepLabel({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <legend className="flex items-center gap-1.5 text-[11px] font-bold text-ink3">
      <span
        aria-hidden="true"
        className="flex h-4 w-4 items-center justify-center rounded-full bg-accent-soft text-[9.5px] font-extrabold text-accent"
      >
        {n}
      </span>
      {children}
    </legend>
  );
}

export default function PostPlanPage() {
  const router = useRouter();
  const [activity, setActivity] = useState<string | null>(null);
  const [openness, setOpenness] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(120);
  const [showDetail, setShowDetail] = useState(false);
  const [detail, setDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [prefill, setPrefill] = useState<PrefillT | null>(null);

  useEffect(() => {
    const candidate = takePrefill();
    if (!candidate) return;
    setActivity("event");
    setOpenness("open_to_chat");
    // Only a calendar candidate knows its time window; a Gmail one keeps the
    // default duration rather than a guess.
    if (candidate.starts_at && candidate.ends_at) {
      setMinutes(closestDuration(candidate.starts_at, candidate.ends_at));
    }
    setShowDetail(true);
    setDetail(
      candidate.location ? `${candidate.title} @ ${candidate.location}` : candidate.title,
    );
    setPrefill(candidate);
  }, []);

  function clearPrefill() {
    setPrefill(null);
    setActivity(null);
    setOpenness(null);
    setMinutes(120);
    setShowDetail(false);
    setDetail("");
  }

  const trimmedDetail = detail.trim();

  function toggleDetail() {
    setShowDetail((open) => {
      if (open) setDetail("");
      return !open;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activity || !openness) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = getClientToken() ?? "";
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject),
      );
      const now = new Date();
      const plan = await createPlan(
        {
          activity,
          openness,
          detail: trimmedDetail || null,
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          starts_at: now.toISOString(),
          ends_at: new Date(now.getTime() + minutes * 60000).toISOString(),
        },
        token,
      );
      router.push(`/plans/${plan.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen justify-center bg-ground px-[18px] pb-28 pt-4 md:pb-10 md:pt-16">
      <form onSubmit={handleSubmit} className="w-full max-w-sm pb-10">
        <Link
          href="/today"
          className="inline-block rounded-full text-[12.5px] font-semibold text-ink3 transition-colors hover:text-ink"
        >
          ← Today
        </Link>

        {prefill && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-accent-soft px-3.5 py-2.5">
            <p className="text-[11px] font-medium text-ink2">
              From {prefill.source === "calendar" ? "Calendar" : "Inbox"}: {prefill.title}
              {prefill.starts_at && prefill.ends_at
                ? `, ${formatTime(prefill.starts_at)}–${formatTime(prefill.ends_at)}`
                : ""}
            </p>
            <button
              type="button"
              onClick={clearPrefill}
              className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink transition-shadow hover:shadow-card"
            >
              Not this one
            </button>
          </div>
        )}

        <div className="mt-3 rounded-card bg-surface p-4 shadow-card">
          <h1 className="text-[15px] font-bold text-ink">Pin a plan</h1>
          <p
            data-testid="plan-preview"
            className="mt-2 text-[13px] font-medium leading-relaxed text-ink2"
          >
            <span className={activity ? "font-bold text-accent" : "text-ink3"}>
              {activity ? ACTIVITY_FRAGMENTS[activity] : "Your plan"}
            </span>
            {", "}
            <span className={openness ? "font-bold text-accent" : "text-ink3"}>
              {openness ? OPENNESS_FRAGMENTS[openness] : "how open you are"}
            </span>
            {" — around for the next "}
            <span className="font-bold text-accent">{durationLabel(minutes)}</span>
            {"."}
            {trimmedDetail && <span className="font-normal"> {trimmedDetail}</span>}
          </p>
        </div>

        <fieldset className="mt-5">
          <StepLabel n={1}>What are you up to?</StepLabel>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {ACTIVITIES.map((a) => (
              <button
                key={a.key}
                type="button"
                aria-pressed={activity === a.key}
                onClick={() => setActivity(a.key)}
                className={`${CHIP} ${activity === a.key ? CHIP_ON : CHIP_OFF}`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <StepLabel n={2}>How open are you?</StepLabel>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {OPENNESSES.map((o) => (
              <button
                key={o.key}
                type="button"
                aria-pressed={openness === o.key}
                onClick={() => setOpenness(o.key)}
                className={`${CHIP} ${openness === o.key ? CHIP_ON : CHIP_OFF}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <StepLabel n={3}>How long are you around?</StepLabel>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.minutes}
                type="button"
                aria-pressed={minutes === d.minutes}
                onClick={() => setMinutes(d.minutes)}
                className={`${CHIP} ${minutes === d.minutes ? CHIP_ON : CHIP_OFF}`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={toggleDetail}
          aria-expanded={showDetail}
          aria-controls="detail"
          className="mt-5 rounded-full text-[12px] font-semibold text-accent transition-colors hover:text-ink"
        >
          <span aria-hidden="true">{showDetail ? "− " : "+ "}</span>
          Add a detail (optional)
        </button>

        {showDetail && (
          <div className="mt-2">
            <label htmlFor="detail" className="sr-only">
              Detail
            </label>
            <textarea
              id="detail"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              maxLength={500}
              placeholder="Blue laptop, corner table."
              className="field h-20 w-full rounded-field border border-rule bg-surface p-3 text-sm text-ink placeholder:text-ink3"
            />
            <p className="text-right font-mono text-[10px] text-ink3">{detail.length}/500</p>
          </div>
        )}

        {error && (
          <p className="mt-3 text-[12px] font-semibold text-accent" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !activity || !openness}
          className="lift btn-press mt-[22px] w-full rounded-full bg-ink py-3.5 text-sm font-bold text-ground shadow-raised hover:shadow-raised-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none motion-reduce:transition-none"
        >
          {submitting ? "Pinning..." : "Pin it"}
        </button>
      </form>

      <SectionNav />
    </main>
  );
}
