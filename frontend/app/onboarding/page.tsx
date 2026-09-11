"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchMe, submitOnboarding } from "@/lib/api";
import { getClientToken } from "@/lib/auth";
import { APP_HOME } from "@/lib/routes";

const PAIN_POINTS: { key: string; label: string }[] = [
  { key: "cold_outreach", label: "Cold outreach (email/LinkedIn) rarely gets a response" },
  { key: "dont_know_who", label: "I never know who's actually nearby worth meeting" },
  { key: "no_time", label: "I don't have time to find the right people" },
  { key: "no_followthrough", label: "Conversations don't lead to a real connection" },
  { key: "other", label: "Other" },
];

const TOTAL_STEPS = 3;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Could not save profile";
}

/** OrbitMark — the one recurring shape (ring + tilted orbit). Same treatment
 *  as the landing/about pages: a quiet brand anchor, never decorative. */
function OrbitMark({ className = "" }: { className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className={`shrink-0 ${className}`}>
      <circle cx="11" cy="11" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.35" />
      <ellipse cx="11" cy="11" rx="9.2" ry="3.35" fill="none" stroke="currentColor" strokeWidth="1.35" transform="rotate(-22 11 11)" />
    </svg>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [city, setCity] = useState("");
  const [painPoints, setPainPoints] = useState<string[]>([]);
  const [painPointOther, setPainPointOther] = useState("");

  const [stepError, setStepError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const token = getClientToken();
    if (!token) {
      router.replace("/sign-in");
      return;
    }
    fetchMe(token)
      .then((user) => {
        if (user.onboarded_at) {
          router.replace(APP_HOME);
          return;
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  function togglePainPoint(key: string) {
    setPainPoints((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  function handleNext() {
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim()) {
        setStepError("First and last name are required");
        return;
      }
    } else if (step === 2) {
      if (!city.trim()) {
        setStepError("City is required");
        return;
      }
    }
    setStepError(null);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function handleBack() {
    setStepError(null);
    setStep((s) => Math.max(s - 1, 1));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (painPoints.length === 0) {
      setStepError("Select at least one option");
      return;
    }
    setStepError(null);
    setSubmitError(null);
    setSubmitting(true);
    try {
      const token = getClientToken();
      if (!token) {
        router.replace("/sign-in");
        return;
      }
      await submitOnboarding(
        {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          city: city.trim(),
          pain_points: painPoints,
          ...(painPoints.includes("other") && painPointOther.trim()
            ? { pain_point_other: painPointOther.trim() }
            : {}),
        },
        token,
      );
      setDone(true);
      setTimeout(() => router.push(APP_HOME), 600);
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ground px-6 py-16" />
    );
  }

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ground px-6 py-16">
        <div className="w-full max-w-sm rounded-card bg-surface p-6 text-center shadow-card lg:max-w-md lg:p-8">
          <h1 className="font-display text-[23px] font-bold tracking-[-0.3px] text-ink">You&apos;re all set</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ground px-6 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[620px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-accent/[0.07] blur-3xl"
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm overflow-hidden rounded-card bg-surface p-6 shadow-card lg:max-w-md lg:p-8"
      >
        <OrbitMark className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 text-ink/[0.04]" />
        <Link href="/" className="relative inline-flex items-center gap-1.5 rounded-full text-[12.5px] font-semibold text-ink3 transition-colors hover:text-ink">
          <span aria-hidden="true">←</span>
          <OrbitMark className="h-[15px] w-[15px]" />
          Orbit
        </Link>

        <div className="relative mt-4" aria-hidden="true">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                  i < step ? "bg-accent" : "bg-rule"
                }`}
              />
            ))}
          </div>
        </div>
        <p className="relative mt-2 text-[11px] font-bold text-ink3">
          Step {step} of {TOTAL_STEPS}
        </p>

        {step === 1 && (
          <div key="step-1" className="motion-safe:animate-[bubbleIn_200ms_ease-out]">
            <h1 className="font-display mt-2 text-[23px] font-bold tracking-[-0.3px] text-ink">What&apos;s your name?</h1>

            <label className="mt-5 block text-[11px] font-bold text-ink3" htmlFor="first_name">
              First name
            </label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              autoComplete="given-name"
              spellCheck={false}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="field mt-1.5 w-full rounded-field border border-rule bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink3 lg:text-base"
            />

            <label className="mt-3 block text-[11px] font-bold text-ink3" htmlFor="last_name">
              Last name
            </label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              autoComplete="family-name"
              spellCheck={false}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="field mt-1.5 w-full rounded-field border border-rule bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink3 lg:text-base"
            />
          </div>
        )}

        {step === 2 && (
          <div key="step-2" className="motion-safe:animate-[bubbleIn_200ms_ease-out]">
            <h1 className="font-display mt-2 text-[23px] font-bold tracking-[-0.3px] text-ink">Where are you based?</h1>

            <label className="mt-5 block text-[11px] font-bold text-ink3" htmlFor="city">
              City
            </label>
            <input
              id="city"
              name="city"
              type="text"
              autoComplete="address-level2"
              placeholder="Austin, TX…"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              className="field mt-1.5 w-full min-w-0 truncate rounded-field border border-rule bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink3 lg:text-base"
            />
          </div>
        )}

        {step === 3 && (
          <div key="step-3" className="motion-safe:animate-[bubbleIn_200ms_ease-out]">
            <h1 className="font-display mt-2 text-[23px] font-bold tracking-[-0.3px] text-ink">What&apos;s been frustrating?</h1>
            <p className="mt-1.5 text-[13px] font-medium text-ink2 lg:text-sm">Pick everything that applies</p>

            <div className="mt-4 space-y-2">
              {PAIN_POINTS.map((option) => {
                const checked = painPoints.includes(option.key);
                return (
                  <label
                    key={option.key}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-field border px-3 py-2.5 text-sm font-medium transition-colors ${
                      checked
                        ? "border-accent bg-accent-soft text-ink"
                        : "border-rule bg-surface text-ink2 hover:border-ink3"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePainPoint(option.key)}
                      className="mt-0.5 shrink-0"
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>

            {painPoints.includes("other") && (
              <div className="mt-2">
                <label
                  className="block text-[11px] font-bold text-ink3"
                  htmlFor="pain_point_other"
                >
                  Tell us more (optional)
                </label>
                <input
                  id="pain_point_other"
                  name="pain_point_other"
                  type="text"
                  maxLength={200}
                  value={painPointOther}
                  onChange={(e) => setPainPointOther(e.target.value)}
                  className="field mt-1.5 w-full rounded-field border border-rule bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink3 lg:text-base"
                />
              </div>
            )}
          </div>
        )}

        {stepError && (
          <p
            role="alert"
            className="mt-3 rounded-field border border-accent/25 bg-accent-soft/60 px-3 py-2 text-[12.5px] font-semibold text-accent"
          >
            {stepError}
          </p>
        )}
        {submitError && (
          <p
            role="alert"
            className="mt-3 rounded-field border border-accent/25 bg-accent-soft/60 px-3 py-2 text-[12.5px] font-semibold text-accent"
          >
            {submitError}
          </p>
        )}

        <div className="mt-6 flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="btn-press flex-1 rounded-full border border-rule bg-surface py-3.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:bg-accent-soft lg:text-base"
            >
              Back
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={handleNext}
              className="lift btn-press flex-1 rounded-full bg-ink py-3.5 text-sm font-bold text-ground shadow-raised hover:shadow-raised-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none lg:text-base"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="lift btn-press flex-1 rounded-full bg-ink py-3.5 text-sm font-bold text-ground shadow-raised hover:shadow-raised-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none lg:text-base"
            >
              {submitting ? "Saving…" : "Save profile"}
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
