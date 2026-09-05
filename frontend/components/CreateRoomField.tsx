"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRoom } from "@/lib/api";
import { getClientToken } from "@/lib/auth";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Could not create room";
}

export default function CreateRoomField({
  lat,
  lon,
}: {
  lat: number;
  lon: number;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = name.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed) return;
    const token = getClientToken();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const room = await createRoom(
        { name: trimmed, purpose: "other", visibility: "public", lat, lon },
        token,
      );
      setName("");
      router.push(`/rooms/${room.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-card bg-surface p-3 shadow-card">
      <label htmlFor="quick-room" className="text-[11px] font-bold text-ink3">
        Create a room
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="quick-room"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="Room name"
          className="field min-w-0 flex-1 rounded-field border border-rule bg-ground px-3 py-2.5 text-sm text-ink placeholder:text-ink3"
        />
        <button
          type="submit"
          disabled={!trimmed || submitting}
          className="btn-press rounded-full bg-ink px-4 text-[13px] font-bold text-ground disabled:opacity-50"
        >
          {submitting ? "…" : "Create"}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-[12px] font-semibold text-accent" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
