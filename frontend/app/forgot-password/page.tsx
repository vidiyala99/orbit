"use client";
import { useState } from "react";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { requestPasswordReset } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await requestPasswordReset(email);
    setSubmitting(false);
    setSubmitted(true);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ground px-6 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[620px] -translate-x-1/2 -translate-y-1/3 rounded-md bg-accent/[0.07] blur-3xl"
      />
      <div className="relative w-full max-w-sm overflow-hidden rounded-card bg-surface p-6 shadow-card lg:p-8">
        <BrandMark className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 text-ink/[0.04]" />
        {submitted ? (
          <p role="status" className="relative text-sm font-medium text-ink">
            If an account exists for that email, a reset link is on its way.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="relative">
            <Link href="/sign-in" className="inline-block rounded-md text-[12.5px] font-semibold text-ink3 transition-colors hover:text-ink">
              ← Sign in
            </Link>
            <h1 className="font-display mt-3 text-balance text-[23px] font-bold tracking-[-0.3px] text-ink lg:text-[26px]">
              Reset your password
            </h1>
            <p className="mt-1.5 text-[13px] font-medium text-ink2 lg:text-sm">
              We&apos;ll email you a link to set a new one.
            </p>
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
            <button
              type="submit"
              disabled={submitting}
              className="lift btn-press mt-5 w-full rounded-md bg-ink py-3.5 text-sm font-bold text-ground shadow-raised hover:shadow-raised-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none lg:text-base"
            >
              {submitting ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
