"use client";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { createPlan } from "@/lib/api";

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return "Could not post plan";
}

export default function PostPlanPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [text, setText] = useState("");
  const [hours, setHours] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const token = (await getToken()) ?? "";
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject),
      );
      const now = new Date();
      const plan = await createPlan(
        {
          text,
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          starts_at: now.toISOString(),
          ends_at: new Date(now.getTime() + hours * 3600000).toISOString(),
        },
        token,
      );
      router.push(`/plans/${plan.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-card bg-card p-5">
        <h1 className="font-hand text-2xl text-ink">Pin a plan</h1>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          maxLength={500}
          placeholder="Grabbing coffee near University Ave, happy to talk shop..."
          className="mt-3 h-24 w-full rounded border border-rule bg-white p-2 text-sm text-ink"
        />
        <label className="mt-3 block font-mono text-[10px] uppercase text-ink2">
          Active for {hours} hour{hours > 1 ? "s" : ""}
        </label>
        <input
          type="range" min={1} max={8} value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="w-full"
        />
        {error && <p className="mt-2 font-mono text-[10px] text-accent">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 w-full rounded-full bg-ink py-3 font-display font-semibold text-card"
        >
          {submitting ? "Pinning..." : "Pin it"}
        </button>
      </form>
    </main>
  );
}
