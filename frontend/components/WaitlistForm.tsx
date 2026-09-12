"use client";

/** Marketing waitlist capture. Posts to /api/waitlist (Formspree behind the server). */

import { useState, type FormEvent } from "react";

type Status = "idle" | "loading" | "ok" | "error";

export default function WaitlistForm({ className = "" }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Try again.");
        return;
      }
      setStatus("ok");
      setMessage("You're on the list. We'll email when Actintro opens.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`flex w-full max-w-md flex-col gap-2 sm:flex-row sm:items-stretch ${className}`}
    >
      <label className="sr-only" htmlFor="waitlist-email">
        Email
      </label>
      <input
        id="waitlist-email"
        type="email"
        name="email"
        required
        autoComplete="email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (status !== "idle" && status !== "loading") setStatus("idle");
        }}
        disabled={status === "loading"}
        className="field min-h-11 w-full flex-1 rounded-md border border-rule bg-surface-raised px-3.5 text-fl-base text-ink placeholder:text-ink3 focus:border-ink/25 disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="btn-press inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-accent px-5 text-fl-base font-bold text-white hover:bg-accent-deep disabled:opacity-60"
      >
        {status === "loading" ? "Joining…" : "Join waitlist"}
      </button>
      {message ? (
        <p
          role={status === "error" ? "alert" : "status"}
          className={`sm:basis-full text-fl-sm font-medium ${
            status === "error" ? "text-rust" : "text-ink2"
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
