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
          ← StayConnected
        </Link>
        <h1 className="mt-3 text-[23px] font-extrabold tracking-[-0.3px] text-ink lg:text-[26px]">
          Post your first plan
        </h1>
        <p className="mt-1.5 text-[13px] font-medium text-ink2 lg:text-sm">Free, takes 30 seconds</p>

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
          <p className="mt-3 text-[12px] font-semibold text-accent" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="lift btn-press mt-5 w-full rounded-full bg-ink py-3.5 text-sm font-bold text-ground shadow-raised hover:shadow-raised-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none lg:text-base"
        >
          {submitting ? "Creating account..." : "Create account"}
        </button>

        <div className="mt-5 flex items-center gap-3 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-ink3">
          <span className="h-px flex-1 bg-rule" />
          or
          <span className="h-px flex-1 bg-rule" />
        </div>

        <a
          href={`${process.env.NEXT_PUBLIC_API_BASE}/auth/google`}
          className="btn-press mt-4 block w-full rounded-full border border-rule bg-surface py-3 text-center text-sm font-semibold text-ink transition-colors hover:border-accent hover:bg-accent-soft lg:text-base"
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
