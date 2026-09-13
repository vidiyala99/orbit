"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { syncLuma } from "@/lib/api";
import { ensureClientToken } from "@/lib/auth";

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
  if (err instanceof Error) {
    const msg = err.message;
    if (msg && msg !== "[object Object]") return msg;
  }
  return "Could not sync";
}

export default function SyncButton({
  lastSyncedAt,
  lumaConnected = false,
  stack = false,
}: {
  lastSyncedAt: string | null;
  /** When false, Sync now explains Connect Luma instead of a silent local stamp. */
  lumaConnected?: boolean;
  /** Vertical layout for the narrow workbench rail. */
  stack?: boolean;
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!lumaConnected) {
      setResult(null);
      setError("Connect Luma first — Sync pulls live Going events and guests.");
      return;
    }
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      const token = await ensureClientToken();
      if (!token) {
        setError("Couldn’t start a session — refresh and try again.");
        return;
      }
      const out = await syncLuma(token);
      const evtLabel = out.events === 1 ? "1 event" : `${out.events} events`;
      const pplLabel = out.people === 1 ? "1 guest" : `${out.people} guests`;
      setResult(`Synced ${evtLabel}, ${pplLabel}`);
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
        disabled={syncing}
        className={`lift btn-press rounded-md border border-ink/15 bg-transparent px-3.5 py-2 text-fl-sm font-medium text-ink2 hover:bg-ink/[0.05] disabled:opacity-70 ${stack ? "w-full" : ""}`}
      >
        {syncing ? "Syncing…" : "Sync now"}
      </button>
      {result ? <p className="text-fl-xs text-ink2">{result}</p> : null}
      {error ? (
        <p role="alert" className="text-fl-xs font-semibold text-accent">
          {error}
        </p>
      ) : null}
    </div>
  );
}
