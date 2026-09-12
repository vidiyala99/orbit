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
  stack = false,
}: {
  lastSyncedAt: string | null;
  eventId: string | null;
  /** Vertical layout for the narrow workbench rail. */
  stack?: boolean;
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
    <div className={stack ? "flex flex-col gap-2" : "flex flex-wrap items-center gap-3"}>
      <p className={`text-ink3 ${stack ? "text-fl-xs" : "text-fl-sm"}`}>
        Last synced <strong className="text-ink2">{timeAgo(lastSyncedAt)}</strong>
      </p>
      <button
        type="button"
        onClick={onClick}
        disabled={syncing || !eventId}
        className={`lift btn-press rounded-md border border-ink/15 bg-transparent px-3.5 py-2 text-fl-sm font-medium text-ink2 hover:bg-ink/[0.05] disabled:opacity-70 ${stack ? "w-full" : ""}`}
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
