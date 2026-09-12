"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { fetchMe, signup } from "@/lib/api";
import { clearClientToken, getClientToken, setClientToken } from "@/lib/auth";
import { afterAuthPath } from "@/lib/routes";
import { resolveApiBase } from "@/lib/apiBase";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Could not create account";
}

export default function SignUpPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      const { access_token, user } = await signup(email, password);
      setClientToken(access_token);
      router.push(afterAuthPath(user));
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

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ground px-6 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[620px] -translate-x-1/2 -translate-y-1/3 rounded-md bg-accent/[0.07] blur-3xl"
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm overflow-hidden rounded-card bg-surface p-6 shadow-card lg:max-w-md lg:p-8"
      >
        <BrandMark className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 text-ink/[0.04]" />
        <Link href="/" className="relative inline-flex items-center gap-1.5 rounded-md text-[12.5px] font-semibold text-ink3 transition-colors hover:text-ink">
          <span aria-hidden="true">←</span>
          <BrandMark className="h-[15px] w-[15px]" />
          Actintro
        </Link>
        <h1 className="font-display relative mt-3 text-balance text-[23px] font-bold tracking-[-0.3px] text-ink lg:text-[26px]">
          Post your first plan
        </h1>
        <p className="relative mt-1.5 text-[13px] font-medium text-ink2 lg:text-sm">Free, takes 30 seconds</p>

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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
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
          className="lift btn-press mt-5 w-full rounded-md bg-ink py-3.5 text-sm font-bold text-ground shadow-raised hover:shadow-raised-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none lg:text-base"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>

        <div className="mt-5 flex items-center gap-3 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-ink3">
          <span className="h-px flex-1 bg-rule" />
          or
          <span className="h-px flex-1 bg-rule" />
        </div>

        <a
          href={`${resolveApiBase()}/auth/google`}
          className="btn-press mt-4 block w-full rounded-md border border-rule bg-surface py-3 text-center text-sm font-semibold text-ink transition-colors hover:border-accent hover:bg-accent-soft lg:text-base"
        >
          Continue with Google
        </a>

        <p className="mt-5 text-center text-[13px] font-medium text-ink2 lg:text-sm">
          Already have an account?{" "}
          <Link href="/sign-in" className="rounded-full font-bold text-accent underline decoration-accent/40 transition-colors hover:text-ink">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
