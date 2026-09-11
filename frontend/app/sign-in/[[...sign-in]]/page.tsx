"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { demoLogin, fetchMe, login } from "@/lib/api";
import { clearClientToken, getClientToken, setClientToken } from "@/lib/auth";
import { afterAuthPath, isDemoLoginEnabled } from "@/lib/routes";
import { resolveApiBase } from "@/lib/apiBase";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Could not sign in";
}

/** The backend sends Google sign-in back here with `?error=` when it can't
 *  complete it (e.g. no Google credentials configured). */
const REDIRECT_ERRORS: Record<string, string> = {
  google_unavailable: "Google sign-in isn't set up here yet. Use email, or tap Try it out.",
};

/** OrbitMark — the one recurring shape (ring + tilted orbit). Same treatment
 *  as the landing page: a quiet brand anchor, never decorative. */
function OrbitMark({ className = "" }: { className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className={`shrink-0 ${className}`}>
      <circle cx="11" cy="11" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.35" />
      <ellipse cx="11" cy="11" rx="9.2" ry="3.35" fill="none" stroke="currentColor" strokeWidth="1.35" transform="rotate(-22 11 11)" />
    </svg>
  );
}

export default function SignInPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const demoEnabled = isDemoLoginEnabled();

  useEffect(() => {
    const redirectError = new URLSearchParams(window.location.search).get("error");
    if (redirectError && REDIRECT_ERRORS[redirectError]) setError(REDIRECT_ERRORS[redirectError]);

    const token = getClientToken();
    if (!token) {
      setChecking(false);
      return;
    }
    fetchMe(token)
      .then((user) => router.replace(afterAuthPath(user)))
      .catch(() => {
        clearClientToken();
        setChecking(false);
      });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { access_token, user } = await login(email, password);
      setClientToken(access_token);
      router.push(afterAuthPath(user));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDemo() {
    setDemoSubmitting(true);
    setError(null);
    try {
      const { access_token, user } = await demoLogin();
      setClientToken(access_token);
      router.push(afterAuthPath(user));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDemoSubmitting(false);
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ground px-6 py-16" />
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
        <h1 className="font-display relative mt-3 text-[23px] font-bold tracking-[-0.3px] text-balance text-ink lg:text-[26px]">Welcome back</h1>
        <p className="relative mt-1.5 text-[13px] font-medium text-ink2 lg:text-sm">Meet people around what you&apos;re into.</p>

        {demoEnabled && (
          <button
            type="button"
            onClick={handleDemo}
            disabled={demoSubmitting}
            className="lift btn-press mt-5 w-full rounded-full bg-ink py-3.5 text-sm font-bold text-ground shadow-raised hover:shadow-raised-hover disabled:cursor-not-allowed disabled:opacity-50 lg:text-base"
          >
            {demoSubmitting ? "Entering…" : "Try it out"}
          </button>
        )}

        <label className="mt-5 block text-[11px] font-bold text-ink3" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="field mt-1.5 w-full rounded-field border border-rule bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink3 lg:text-base"
        />

        <label className="mt-3 block text-[11px] font-bold text-ink3" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
          className="btn-press mt-5 w-full rounded-full border border-rule bg-surface py-3.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50 lg:text-base"
        >
          {submitting ? "Signing in…" : "Sign in with email"}
        </button>

        <a
          href={`${resolveApiBase()}/auth/google`}
          className="btn-press mt-3 block w-full rounded-full border border-rule bg-surface py-3 text-center text-sm font-medium text-ink3 transition-colors hover:border-accent hover:text-ink lg:text-base"
        >
          Continue with Google
        </a>

        <p className="mt-5 text-center text-[13px] font-medium text-ink2 lg:text-sm">
          <Link href="/forgot-password" className="rounded-full font-bold text-accent underline decoration-accent/40 transition-colors hover:text-ink">
            Forgot password?
          </Link>
        </p>
      </form>
    </main>
  );
}
