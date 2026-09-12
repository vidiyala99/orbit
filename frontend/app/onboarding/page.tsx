"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { fetchMe, submitOnboarding } from "@/lib/api";
import { getClientToken } from "@/lib/auth";
import { APP_HOME } from "@/lib/routes";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Could not save profile";
}

export default function OnboardingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [error, setError] = useState<string | null>(null);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const token = getClientToken();
      if (!token) {
        router.replace("/sign-in");
        return;
      }
      await submitOnboarding({ first_name: firstName.trim(), last_name: lastName.trim() }, token);
      setDone(true);
      setTimeout(() => router.push(APP_HOME), 600);
    } catch (err) {
      setError(errorMessage(err));
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
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[620px] -translate-x-1/2 -translate-y-1/3 rounded-md bg-accent/[0.07] blur-3xl"
      />
      <form
        onSubmit={handleSubmit}
        noValidate
        className="relative w-full max-w-sm overflow-hidden rounded-card bg-surface p-6 shadow-card lg:max-w-md lg:p-8"
      >
        <BrandMark className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 text-ink/[0.04]" />
        <Link href="/" className="relative inline-flex items-center gap-1.5 rounded-md text-[12.5px] font-semibold text-ink3 transition-colors hover:text-ink">
          <span aria-hidden="true">←</span>
          <BrandMark className="h-[15px] w-[15px]" />
          Actintro
        </Link>

        <h1 className="font-display mt-3 text-[23px] font-bold tracking-[-0.3px] text-ink">What&apos;s your name?</h1>

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

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-field border border-accent/25 bg-accent-soft/60 px-3 py-2 text-[12.5px] font-semibold text-accent"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="lift btn-press mt-6 w-full rounded-md bg-ink py-3.5 text-sm font-bold text-ground shadow-raised hover:shadow-raised-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none lg:text-base"
        >
          {submitting ? "Saving…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
