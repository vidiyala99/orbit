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
    <main className="flex min-h-screen items-center justify-center bg-ground px-6 py-16">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-card bg-surface p-6 shadow-card lg:max-w-md lg:p-8"
      >
        <Link href="/" className="inline-block rounded-full text-[12.5px] font-semibold text-ink3 transition-colors hover:text-ink">
          ← Orbit
        </Link>
        <h1 className="mt-3 text-[23px] font-extrabold tracking-[-0.3px] text-ink lg:text-[26px]">Welcome back</h1>
        <p className="mt-1.5 text-[13px] font-medium text-ink2 lg:text-sm">Meet people around what you&apos;re into.</p>

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
          <p className="mt-3 text-[12px] font-semibold text-accent" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn-press mt-5 w-full rounded-full border border-rule bg-surface py-3.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50 lg:text-base"
        >
          {submitting ? "Signing in..." : "Sign in with email"}
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
