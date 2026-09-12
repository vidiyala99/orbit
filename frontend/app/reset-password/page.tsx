"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { resetPassword } from "@/lib/api";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const token = searchParams.get("token") ?? "";
    await resetPassword(token, password);
    setSubmitting(false);
    setDone(true);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ground px-6 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[620px] -translate-x-1/2 -translate-y-1/3 rounded-md bg-accent/[0.07] blur-3xl"
      />
      <div className="relative w-full max-w-sm overflow-hidden rounded-card bg-surface p-6 shadow-card lg:p-8">
        <BrandMark className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 text-ink/[0.04]" />
        {done ? (
          <div role="status" className="relative">
            <p className="text-sm font-medium text-ink">Password updated.</p>
            <Link href="/sign-in" className="mt-3 inline-block rounded-md text-[12.5px] font-semibold text-accent underline decoration-accent/40 transition-colors hover:text-ink">
              Sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="relative">
            <Link href="/sign-in" className="inline-block rounded-md text-[12.5px] font-semibold text-ink3 transition-colors hover:text-ink">
              ← Sign in
            </Link>
            <h1 className="font-display mt-3 text-balance text-[23px] font-bold tracking-[-0.3px] text-ink lg:text-[26px]">Set a new password</h1>
            <label className="mt-5 block text-[11px] font-bold text-ink3" htmlFor="password">
              New password
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
            <button
              type="submit"
              disabled={submitting}
              className="lift btn-press mt-5 w-full rounded-md bg-ink py-3.5 text-sm font-bold text-ground shadow-raised hover:shadow-raised-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none lg:text-base"
            >
              {submitting ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
