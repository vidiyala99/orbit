"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { syncEvent } from "@/lib/api";
import { getClientToken } from "@/lib/auth";

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Could not sync";
}

export default function SyncButton({
  lastSyncedAt,
  eventId,
}: {
  lastSyncedAt: string | null;
  eventId: string | null;
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!eventId) return;
    const token = getClientToken();
    if (!token) return;
    setSyncing(true);
    setError(null);
    try {
      await syncEvent(eventId, token);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <p className="text-fl-sm text-ink3">
        Last synced <strong className="text-ink2">{timeAgo(lastSyncedAt)}</strong>
      </p>
      <button
        type="button"
        onClick={onClick}
        disabled={syncing || !eventId}
        className="lift btn-press rounded-full bg-accent px-4 py-2 text-fl-sm font-bold text-white disabled:opacity-70"
      >
        {syncing ? "Syncing…" : "Sync now"}
      </button>
      {error ? (
        <p role="alert" className="text-fl-xs font-semibold text-accent">
          {error}
        </p>
      ) : null}
    </div>
  );
}
