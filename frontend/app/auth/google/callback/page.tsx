"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeGoogleCode } from "@/lib/api";
import { setClientToken } from "@/lib/auth";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setError("Missing code from Google");
      return;
    }
    exchangeGoogleCode(code)
      .then(({ access_token, user }) => {
        setClientToken(access_token);
        router.push(user.onboarded_at ? "/today" : "/onboarding");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not sign in with Google"));
  }, [searchParams, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-board px-6 py-16 [background-image:radial-gradient(rgba(0,0,0,.12)_1px,transparent_1px)] [background-size:7px_7px]">
      <div className="relative w-full max-w-sm rounded-card bg-card p-6 text-center shadow-[3px_6px_14px_rgba(0,0,0,0.32)] lg:p-9">
        <span
          className="absolute -top-2 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-accent shadow-[0_2px_3px_rgba(0,0,0,.35)]"
          aria-hidden="true"
        />
        <p className="font-body text-sm text-ink" role={error ? "alert" : undefined}>
          {error ?? "Signing you in..."}
        </p>
      </div>
    </main>
  );
}
