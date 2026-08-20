"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyEmail } from "@/lib/api";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Could not verify email";
}

export default function VerifyEmailPage() {
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
    <main className="flex min-h-screen items-center justify-center bg-board px-6 py-16 [background-image:radial-gradient(rgba(0,0,0,.12)_1px,transparent_1px)] [background-size:7px_7px]">
      <div className="relative w-full max-w-sm rounded-card bg-card p-6 text-center shadow-[3px_6px_14px_rgba(0,0,0,0.32)] lg:p-9">
        <span
          className="absolute -top-2 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-accent shadow-[0_2px_3px_rgba(0,0,0,.35)]"
          aria-hidden="true"
        />
        {status === "pending" && <p className="font-body text-sm text-ink">Verifying...</p>}
        {status === "success" && (
          <>
            <p className="font-display text-lg font-bold text-ink lg:text-xl">Email verified</p>
            <Link href="/today" className="mt-3 inline-block font-mono text-xs text-accent">
              Back to the board
            </Link>
          </>
        )}
        {status === "error" && (
          <p className="font-mono text-xs text-accent" role="alert">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
