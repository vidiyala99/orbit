"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchMe, submitOnboarding } from "@/lib/api";
import { getClientToken } from "@/lib/auth";

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
          router.replace("/today");
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
      setTimeout(() => router.push("/today"), 600);
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-board px-6 py-16 [background-image:radial-gradient(rgba(0,0,0,.12)_1px,transparent_1px)] [background-size:7px_7px]" />
    );
  }

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-board px-6 py-16 [background-image:radial-gradient(rgba(0,0,0,.12)_1px,transparent_1px)] [background-size:7px_7px]">
        <div className="relative w-full max-w-sm rotate-[-1deg] rounded-card bg-card p-6 text-center shadow-[3px_6px_14px_rgba(0,0,0,0.32)] lg:max-w-md lg:p-9">
          <span
            className="absolute -top-2 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-accent shadow-[0_2px_3px_rgba(0,0,0,.35)]"
            aria-hidden="true"
          />
          <h1 className="font-hand text-2xl text-ink">You&apos;re all set</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-board px-6 py-16 [background-image:radial-gradient(rgba(0,0,0,.12)_1px,transparent_1px)] [background-size:7px_7px]">
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm rotate-[-1deg] rounded-card bg-card p-6 shadow-[3px_6px_14px_rgba(0,0,0,0.32)] lg:max-w-md lg:p-9"
      >
        <span
          className="absolute -top-2 left-8 h-3.5 w-3.5 rounded-full bg-accent shadow-[0_2px_3px_rgba(0,0,0,.35)]"
          aria-hidden="true"
        />
        <Link href="/" className="font-display text-xs font-bold text-ink2 lg:text-sm">
          ← StayConnected
        </Link>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-wide text-ink2 lg:text-xs">
          Step {step} of {TOTAL_STEPS}
        </p>

        {step === 1 && (
          <div key="step-1" className="motion-safe:animate-[bubbleIn_200ms_ease-out]">
            <h1 className="mt-2 font-hand text-2xl text-ink">What&apos;s your name?</h1>

            <label className="mt-5 block font-mono text-[9px] uppercase tracking-wide text-ink2 lg:text-[10px]" htmlFor="first_name">
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
              className="mt-1 w-full rounded border border-rule bg-white px-3 py-2 text-sm text-ink lg:text-base"
            />

            <label className="mt-3 block font-mono text-[9px] uppercase tracking-wide text-ink2 lg:text-[10px]" htmlFor="last_name">
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
              className="mt-1 w-full rounded border border-rule bg-white px-3 py-2 text-sm text-ink lg:text-base"
            />
          </div>
        )}

        {step === 2 && (
          <div key="step-2" className="motion-safe:animate-[bubbleIn_200ms_ease-out]">
            <h1 className="mt-2 font-hand text-2xl text-ink">Where are you based?</h1>

            <label className="mt-5 block font-mono text-[9px] uppercase tracking-wide text-ink2 lg:text-[10px]" htmlFor="city">
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
              className="mt-1 w-full min-w-0 truncate rounded border border-rule bg-white px-3 py-2 text-sm text-ink lg:text-base"
            />
          </div>
        )}

        {step === 3 && (
          <div key="step-3" className="motion-safe:animate-[bubbleIn_200ms_ease-out]">
            <h1 className="mt-2 font-hand text-2xl text-ink">What&apos;s been frustrating?</h1>
            <p className="mt-1 font-body text-xs text-ink2 lg:text-sm">Pick everything that applies</p>

            <div className="mt-4 space-y-2">
              {PAIN_POINTS.map((option) => (
                <label
                  key={option.key}
                  className="flex cursor-pointer items-start gap-2 font-body text-sm text-ink"
                >
                  <input
                    type="checkbox"
                    checked={painPoints.includes(option.key)}
                    onChange={() => togglePainPoint(option.key)}
                    className="mt-0.5"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>

            {painPoints.includes("other") && (
              <div className="mt-2">
                <label
                  className="block font-mono text-[9px] uppercase tracking-wide text-ink2 lg:text-[10px]"
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
                  className="mt-1 w-full rounded border border-rule bg-white px-3 py-2 text-sm text-ink lg:text-base"
                />
              </div>
            )}
          </div>
        )}

        {stepError && (
          <p className="mt-3 font-mono text-[10px] text-accent lg:text-xs" role="alert">
            {stepError}
          </p>
        )}
        {submitError && (
          <p className="mt-3 font-mono text-[10px] text-accent lg:text-xs" role="alert">
            {submitError}
          </p>
        )}

        <div className="mt-6 flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="btn-press flex-1 rounded-full border border-rule py-3 font-display text-sm font-semibold text-ink lg:py-3.5 lg:text-base"
            >
              Back
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={handleNext}
              className="btn-press flex-1 rounded-full bg-ink py-3 font-display text-sm font-semibold text-card disabled:cursor-not-allowed disabled:opacity-60 lg:py-3.5 lg:text-base"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="btn-press flex-1 rounded-full bg-ink py-3 font-display text-sm font-semibold text-card disabled:cursor-not-allowed disabled:opacity-60 lg:py-3.5 lg:text-base"
            >
              {submitting ? "Saving…" : "Save profile"}
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
