"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeGoogleCode } from "@/lib/api";
import { setClientToken } from "@/lib/auth";
import { afterAuthPath } from "@/lib/routes";

function GoogleCallbackContent() {
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
        router.push(afterAuthPath(user));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not sign in with Google"));
  }, [searchParams, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-ground px-6 py-16">
      <div className="w-full max-w-sm rounded-card bg-surface p-6 text-center shadow-card lg:p-8">
        <p className="text-sm font-medium text-ink" role={error ? "alert" : undefined}>
          {error ?? "Signing you in..."}
        </p>
      </div>
    </main>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={null}>
      <GoogleCallbackContent />
    </Suspense>
  );
}
