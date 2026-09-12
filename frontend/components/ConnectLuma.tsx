"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { connectLuma, disconnectLuma, startLumaConnect, syncLuma } from "@/lib/api";
import { ensureClientToken } from "@/lib/auth";

function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message;
    if (msg && msg !== "[object Object]") return msg;
  }
  if (typeof err === "string" && err.trim()) return err;
  return "Something went wrong";
}

/** Connected state — status chip, sync, disconnect. */
function ConnectedView({ lastSyncedAt }: { lastSyncedAt?: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    const token = await ensureClientToken();
    if (!token) {
      setError("Couldn’t start a session — refresh and try again.");
      return;
    }
    setSyncing(true);
    setSyncResult(null);
    setError(null);
    try {
      const result = await syncLuma(token);
      const evtLabel = result.events === 1 ? "1 event" : `${result.events} events`;
      const pplLabel = result.people === 1 ? "1 guest" : `${result.people} guests`;
      setSyncResult(`Synced ${evtLabel}, ${pplLabel}`);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    const token = await ensureClientToken();
    if (!token) {
      setError("Couldn’t start a session — refresh and try again.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await disconnectLuma(token);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  void lastSyncedAt;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-md bg-accent-soft px-3 py-1 text-fl-xs font-bold text-accent">
        Luma connected
      </span>
      <button
        type="button"
        onClick={handleSync}
        disabled={syncing}
        className="lift btn-press rounded-md bg-accent px-4 py-2 text-fl-sm font-bold text-white disabled:opacity-70"
      >
        {syncing ? "Syncing…" : "Sync guests"}
      </button>
      <button
        type="button"
        onClick={handleDisconnect}
        disabled={busy}
        className="rounded-md border border-rule bg-surface px-3 py-2 text-fl-xs font-semibold text-ink2 hover:bg-ground disabled:opacity-60"
      >
        Disconnect
      </button>
      {syncResult ? <p className="text-fl-xs text-ink2">{syncResult}</p> : null}
      {error ? (
        <p role="alert" className="text-fl-xs font-semibold text-accent">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type Step = "email" | "code";

/** Actintro-only: email → Luma emails a code → enter code here. Never opens luma.com. */
function ConnectModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode() {
    const trimmed = email.trim();
    if (!trimmed.includes("@")) {
      setError("Enter the email you use on Luma");
      return;
    }
    setBusy(true);
    setError(null);
    const token = await ensureClientToken();
    if (!token) {
      setBusy(false);
      setError("Couldn’t start a session — refresh and try again.");
      return;
    }
    try {
      await startLumaConnect({ email: trimmed }, token);
      setStep("code");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleConnect() {
    const trimmedEmail = email.trim();
    const trimmedCode = code.trim();
    if (!trimmedEmail.includes("@")) {
      setError("Enter the email you use on Luma");
      return;
    }
    if (trimmedCode.length < 4) {
      setError("Enter the 6-digit code from your email");
      return;
    }
    const token = await ensureClientToken();
    if (!token) {
      setError("Couldn’t start a session — refresh and try again.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await connectLuma({ email: trimmedEmail, code: trimmedCode }, token);
      onClose();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const canSend = !busy && email.trim().includes("@");
  const canConnect = !busy && code.trim().length >= 4;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Connect Luma"
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      style={{ background: "rgba(42,36,28,0.35)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[min(100dvh,28rem)] w-full max-w-sm overflow-y-auto rounded-t-card bg-surface px-4 py-4 shadow-raised sm:rounded-card sm:px-5 sm:py-5">
        <h2 className="font-display text-fl-lg font-semibold text-ink">Connect Luma</h2>
        <p className="mt-0.5 text-fl-xs text-ink3">
          Stay in Actintro — no Luma tab. Enter your email, then the code from your inbox.
        </p>

        {step === "email" ? (
          <div className="mt-3 space-y-2">
            <label className="block text-fl-xs font-semibold text-ink2" htmlFor="luma-email">
              Luma email
            </label>
            <input
              id="luma-email"
              type="email"
              autoComplete="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSend) handleSendCode();
              }}
              className="w-full rounded-field border border-rule bg-ground px-3 py-2 text-fl-sm text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <p className="text-fl-xs text-ink2">
              Code sent to <span className="font-semibold text-ink">{email.trim()}</span>. Check
              your inbox (and spam).
            </p>
            <label className="block text-fl-xs font-semibold text-ink2" htmlFor="luma-code">
              6-digit code
            </label>
            <input
              id="luma-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 8))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canConnect) handleConnect();
              }}
              className="w-full rounded-field border border-rule bg-ground px-3 py-2 text-center font-mono text-fl-lg tracking-widest text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <button
              type="button"
              className="text-fl-xs font-semibold text-accent hover:underline"
              disabled={busy}
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
            >
              Use a different email
            </button>
          </div>
        )}

        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-field border border-rule bg-rust-soft px-3 py-2 text-fl-xs font-semibold text-rust"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-rule px-4 py-2 text-fl-sm font-semibold text-ink2 hover:bg-ground"
          >
            Cancel
          </button>
          {step === "email" ? (
            <button
              type="button"
              onClick={handleSendCode}
              disabled={!canSend}
              className="lift btn-press rounded-md bg-accent px-4 py-2 text-fl-sm font-bold text-white disabled:opacity-70"
            >
              {busy ? "Sending…" : "Continue with Luma"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={!canConnect}
              className="lift btn-press rounded-md bg-accent px-4 py-2 text-fl-sm font-bold text-white disabled:opacity-70"
            >
              {busy ? "Connecting…" : "Connect"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConnectLuma({
  lumaConnected,
  lastSyncedAt,
}: {
  lumaConnected: boolean;
  lastSyncedAt?: string | null;
}) {
  const [open, setOpen] = useState(false);

  if (lumaConnected) {
    return <ConnectedView lastSyncedAt={lastSyncedAt} />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lift btn-press rounded-md border border-ink/15 bg-transparent px-4 py-2 text-fl-sm font-medium text-ink2 hover:bg-ink/[0.05]"
      >
        Connect Luma
      </button>
      {open ? <ConnectModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}
