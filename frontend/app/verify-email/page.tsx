"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyEmail } from "@/lib/api";
import { APP_HOME } from "@/lib/routes";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Could not verify email";
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
    <main className="flex min-h-screen items-center justify-center bg-ground px-6 py-16">
      <div className="w-full max-w-sm rounded-card bg-surface p-6 text-center shadow-card lg:p-8">
        {status === "pending" && <p className="text-sm font-medium text-ink">Verifying...</p>}
        {status === "success" && (
          <>
            <p className="text-[19px] font-extrabold tracking-[-0.3px] text-ink lg:text-[21px]">Email verified</p>
            <Link href={APP_HOME} className="mt-3 inline-block text-[12.5px] font-semibold text-accent">
              Back to the desk
            </Link>
          </>
        )}
        {status === "error" && (
          <p className="text-[12.5px] font-semibold text-accent" role="alert">
            {error}
          </p>
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
