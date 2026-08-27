"use client";
import { useState } from "react";
import { joinWaitlist, fetchWaitlistCount } from "@/lib/api";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Could not join waitlist";
}

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await joinWaitlist(email);
      const total = await fetchWaitlistCount();
      setCount(total);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (count !== null) {
    return (
      <p className="inline-block rounded-full bg-accent-soft px-4 py-2 text-[13px] font-bold text-accent lg:text-base">
        You&apos;re on the list — {count} {count === 1 ? "person" : "people"} so far
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 lg:gap-3">
      <input
        type="email"
        required
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        className="field min-w-0 rounded-full border border-rule bg-surface px-4 py-2.5 text-xs text-ink placeholder:text-ink3 lg:px-5 lg:py-3.5 lg:text-lg"
      />
      <button
        type="submit"
        disabled={submitting}
        className="lift btn-press whitespace-nowrap rounded-full bg-accent px-5 py-2.5 text-xs font-bold text-white shadow-raised hover:shadow-raised-hover disabled:cursor-not-allowed disabled:opacity-50 lg:px-7 lg:py-3.5 lg:text-lg"
      >
        {submitting ? "Joining..." : "Join the waitlist"}
      </button>
      {error && <p className="text-[11px] font-semibold text-accent lg:text-sm">{error}</p>}
    </form>
  );
}
