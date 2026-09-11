"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyEmail } from "@/lib/api";
import { APP_HOME } from "@/lib/routes";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Could not verify email";
}

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

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setError("Missing verification token");
      return;
    }
    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setError(errorMessage(err));
      });
  }, [searchParams]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ground px-6 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[620px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-accent/[0.07] blur-3xl"
      />
      <div className="relative w-full max-w-sm overflow-hidden rounded-card bg-surface p-6 text-center shadow-card lg:p-8">
        <OrbitMark className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 text-ink/[0.04]" />
        {status === "pending" && (
          <p role="status" className="relative text-sm font-medium text-ink">
            Verifying…
          </p>
        )}
        {status === "success" && (
          <div role="status" className="relative">
            <p className="font-display text-[19px] font-bold tracking-[-0.3px] text-ink lg:text-[21px]">Email verified</p>
            <Link href={APP_HOME} className="mt-3 inline-block rounded-full text-[12.5px] font-semibold text-accent underline decoration-accent/40 transition-colors hover:text-ink">
              Back to the desk
            </Link>
          </div>
        )}
        {status === "error" && (
          <div className="relative">
            <p
              role="alert"
              className="rounded-field border border-accent/25 bg-accent-soft/60 px-3 py-2 text-[12.5px] font-semibold text-accent"
            >
              {error}
            </p>
            <Link href="/sign-in" className="mt-3 inline-block rounded-full text-[12.5px] font-semibold text-ink3 transition-colors hover:text-ink">
              ← Back to sign in
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
