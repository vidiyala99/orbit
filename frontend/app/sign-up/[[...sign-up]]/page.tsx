"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchMe, signup } from "@/lib/api";
import { clearClientToken, getClientToken, setClientToken } from "@/lib/auth";

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
      .then((user) => router.replace(user.onboarded_at ? "/today" : "/onboarding"))
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
      router.push(user.onboarded_at ? "/today" : "/onboarding");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-board px-6 py-16 [background-image:radial-gradient(rgba(0,0,0,.12)_1px,transparent_1px)] [background-size:7px_7px]" />
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
        <h1 className="mt-3 font-display text-xl font-bold text-ink lg:text-2xl">
          Post your first plan
        </h1>
        <p className="mt-1 font-body text-xs text-ink2 lg:text-sm">Free, takes 30 seconds</p>

        <label className="mt-5 block font-mono text-[9px] uppercase tracking-wide text-ink2 lg:text-[10px]" htmlFor="email">
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
          className="mt-1 w-full rounded border border-rule bg-white px-3 py-2 text-sm text-ink lg:text-base"
        />

        <label className="mt-3 block font-mono text-[9px] uppercase tracking-wide text-ink2 lg:text-[10px]" htmlFor="password">
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
          className="mt-1 w-full rounded border border-rule bg-white px-3 py-2 text-sm text-ink lg:text-base"
        />

        {error && (
          <p className="mt-3 font-mono text-[10px] text-accent lg:text-xs" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn-press mt-5 w-full rounded-full bg-ink py-3 font-display text-sm font-semibold text-card disabled:cursor-not-allowed disabled:opacity-60 lg:py-3.5 lg:text-base"
        >
          {submitting ? "Creating account..." : "Create account"}
        </button>

        <div className="mt-4 flex items-center gap-3 text-[10px] font-mono uppercase text-ink2 lg:text-xs">
          <span className="h-px flex-1 bg-rule" />
          or
          <span className="h-px flex-1 bg-rule" />
        </div>

        <a
          href={`${process.env.NEXT_PUBLIC_API_BASE}/auth/google`}
          className="btn-press mt-4 block w-full rounded-full border border-rule py-2.5 text-center font-display text-sm font-semibold text-ink lg:py-3 lg:text-base"
        >
          Continue with Google
        </a>

        <p className="mt-5 text-center font-body text-xs text-ink2 lg:text-sm">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-semibold text-accent">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
