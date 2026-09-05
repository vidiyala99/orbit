"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { demoLogin } from "@/lib/api";
import { getClientToken, setClientToken } from "@/lib/auth";
import { DEMO_OFFLINE_TOKEN } from "@/lib/demoFixtures";
import { isDemoLoginEnabled } from "@/lib/routes";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Could not enter demo";
}

export default function DemoEnterButton({
  className,
  label = "Try it out",
  next = "/try",
}: {
  className?: string;
  label?: string;
  next?: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isDemoLoginEnabled()) return null;

  async function handleClick() {
    setSubmitting(true);
    setError(null);
    try {
      if (!getClientToken()) {
        try {
          const { access_token } = await demoLogin();
          setClientToken(access_token);
        } catch (err) {
          setClientToken(DEMO_OFFLINE_TOKEN);
          setError(errorMessage(err));
        }
      }
      router.push(next);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <button
        type="button"
        onClick={handleClick}
        disabled={submitting}
        className={
          className ??
          "lift btn-press w-full rounded-full bg-ink px-5 py-3 text-sm font-bold text-ground shadow-raised hover:shadow-raised-hover disabled:cursor-not-allowed disabled:opacity-50 lg:px-7 lg:py-3.5 lg:text-lg"
        }
      >
        {submitting ? "Entering…" : label}
      </button>
      {error && (
        <p className="mt-2 text-center text-[12px] font-semibold text-accent" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
