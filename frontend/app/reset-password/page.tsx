"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
    <main className="flex min-h-screen items-center justify-center bg-ground px-6 py-16">
      <div className="w-full max-w-sm rounded-card bg-surface p-6 shadow-card lg:p-8">
        {done ? (
          <>
            <p className="text-sm font-medium text-ink">Password updated.</p>
            <Link href="/sign-in" className="mt-3 inline-block text-[12.5px] font-semibold text-accent">
              Sign in
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h1 className="text-[23px] font-extrabold tracking-[-0.3px] text-ink lg:text-[26px]">Set a new password</h1>
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
              className="lift btn-press mt-5 w-full rounded-full bg-ink py-3.5 text-sm font-bold text-ground shadow-raised hover:shadow-raised-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none lg:text-base"
            >
              {submitting ? "Updating..." : "Update password"}
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
