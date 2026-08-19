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
      <p className="font-mono text-xs text-accent lg:text-base">
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
        className="rounded-full border border-rule bg-white px-3 py-1.5 text-xs text-ink lg:px-5 lg:py-3.5 lg:text-lg"
      />
      <button
        type="submit"
        disabled={submitting}
        className="btn-press rounded-full bg-accent px-4 py-1.5 font-display text-xs font-semibold text-card lg:px-7 lg:py-3.5 lg:text-lg"
      >
        {submitting ? "Joining..." : "Join the waitlist"}
      </button>
      {error && <p className="font-mono text-[10px] text-accent lg:text-sm">{error}</p>}
    </form>
  );
}
