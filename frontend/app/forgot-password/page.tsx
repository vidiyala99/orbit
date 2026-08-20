"use client";
import { useState } from "react";
import Link from "next/link";
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
    <main className="flex min-h-screen items-center justify-center bg-board px-6 py-16 [background-image:radial-gradient(rgba(0,0,0,.12)_1px,transparent_1px)] [background-size:7px_7px]">
      <div className="relative w-full max-w-sm rounded-card bg-card p-6 shadow-[3px_6px_14px_rgba(0,0,0,0.32)] lg:p-9">
        <span
          className="absolute -top-2 left-8 h-3.5 w-3.5 rounded-full bg-accent shadow-[0_2px_3px_rgba(0,0,0,.35)]"
          aria-hidden="true"
        />
        {submitted ? (
          <p className="font-body text-sm text-ink">
            If an account exists for that email, a reset link is on its way.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <Link href="/sign-in" className="font-display text-xs font-bold text-ink2 lg:text-sm">
              ← Sign in
            </Link>
            <h1 className="mt-3 font-display text-lg font-bold text-ink lg:text-2xl">
              Reset your password
            </h1>
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
            <button
              type="submit"
              disabled={submitting}
              className="btn-press mt-5 w-full rounded-full bg-ink py-3 font-display text-sm font-semibold text-card disabled:cursor-not-allowed disabled:opacity-60 lg:py-3.5 lg:text-base"
            >
              {submitting ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
