"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { fetchRoomMessages, postRoomMessage } from "@/lib/api";
import { getClientToken } from "@/lib/auth";
import { confirmationLabel, dayLabel, timeRangeLabel } from "@/lib/rooms";
import { PlanT, RoomMessageT, TimeProposalT } from "@/lib/types";

/** Rooms have no WebSocket (unlike 1:1 threads), so the thread is kept fresh by
 *  polling — slow enough to be cheap, fast enough that a reply isn't missed. */
const POLL_MS = 5000;

const CHIP =
  "inline-flex items-center rounded-full bg-accent-soft px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.04em] text-accent";

function PlanShareCard({ plan }: { plan: PlanT }) {
  const now = Date.now();
  const isLive =
    new Date(plan.starts_at).getTime() <= now && now <= new Date(plan.ends_at).getTime();

  return (
    <div
      data-testid="plan-share-card"
      className="rounded-card bg-surface p-3 shadow-card"
    >
      <div className="flex gap-3">
        {/* Stand-in for the plan's photo — plans carry no imagery yet. */}
        <span className="h-12 w-12 shrink-0 rounded-[10px] bg-accent-soft" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-snug text-ink">{plan.text}</p>
          <p className="mt-1 font-mono text-[10.5px] text-ink3">
            {timeRangeLabel(plan.starts_at, plan.ends_at)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-rule pt-2.5">
        {isLive ? (
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-accent">
            <span className="live-dot" aria-hidden="true" />
            LIVE
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-ink3">ENDED</span>
        )}
        <Link
          href={`/plans/${plan.id}`}
          className="btn-press rounded-full bg-ink px-3 py-1.5 text-[11.5px] font-bold text-ground"
        >
          View plan
        </Link>
      </div>
    </div>
  );
}

function TimeProposalCard({ proposal, body }: { proposal: TimeProposalT; body: string | null }) {
  return (
    <div
      data-testid="time-proposal-card"
      className="rounded-card bg-surface p-3 shadow-card"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-ink3">Proposed time</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className={CHIP}>{dayLabel(proposal.starts_at)}</span>
        <span className={CHIP}>{timeRangeLabel(proposal.starts_at, proposal.ends_at)}</span>
      </div>
      {body && <p className="mt-2.5 text-[13px] font-medium leading-relaxed text-ink">{body}</p>}
      <p
        data-testid="proposal-status"
        className="mt-2.5 border-t border-rule pt-2.5 font-mono text-[10.5px] text-ink3"
      >
        {confirmationLabel(proposal.confirmations.length, proposal.member_count, proposal.status)}
      </p>
    </div>
  );
}

export default function RoomChat({
  roomId,
  currentUserId,
  initialMessages,
}: {
  roomId: string;
  currentUserId: string;
  initialMessages: RoomMessageT[];
}) {
  const [messages, setMessages] = useState<RoomMessageT[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = setInterval(async () => {
      try {
        const next = await fetchRoomMessages(roomId, getClientToken() ?? "");
        if (!cancelled) setMessages(next);
      } catch {
        // A dropped poll is not worth interrupting the thread for; the next
        // tick will pick the messages up.
      }
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [roomId]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages]);

  const trimmed = draft.trim();

  async function send() {
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const sent = await postRoomMessage(roomId, trimmed, getClientToken() ?? "");
      setMessages((prev) => [...prev, sent]);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Could not send message");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        role="log"
        aria-label="Room messages"
        className="flex-1 space-y-2 overflow-y-auto px-[18px] py-4"
      >
        {messages.length === 0 && (
          <p className="py-8 text-center text-[12.5px] font-medium text-ink3">
            No messages yet — say hello.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          if (m.kind === "plan_share" && m.plan) {
            return (
              <div key={m.id} data-testid={`room-message-${m.id}`} data-mine={String(mine)} className="max-w-[86%]">
                <PlanShareCard plan={m.plan} />
              </div>
            );
          }
          if (m.kind === "time_proposal" && m.time_proposal) {
            return (
              <div key={m.id} data-testid={`room-message-${m.id}`} data-mine={String(mine)} className="max-w-[86%]">
                <TimeProposalCard proposal={m.time_proposal} body={m.body} />
              </div>
            );
          }
          return (
            <div
              key={m.id}
              data-testid={`room-message-${m.id}`}
              data-mine={String(mine)}
              className={`max-w-[74%] px-3.5 py-2 text-[13px] font-medium leading-relaxed shadow-card ${
                mine
                  ? "ml-auto rounded-[14px] rounded-br-[4px] bg-ink text-ground"
                  : "rounded-[14px] rounded-bl-[4px] bg-surface text-ink"
              }`}
            >
              {m.body}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {error && (
        <p className="px-[18px] pb-1 text-[12px] font-semibold text-accent" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2 border-t border-rule bg-ground p-3">
        <label htmlFor="room-draft" className="sr-only">
          Message
        </label>
        <input
          id="room-draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message the room…"
          autoComplete="off"
          className="field min-w-0 flex-1 rounded-full border border-rule bg-surface px-4 py-2.5 text-[13px] text-ink placeholder:text-ink3"
        />
        <button
          type="button"
          onClick={send}
          disabled={!trimmed || busy}
          className="btn-press shrink-0 rounded-full bg-accent px-4 py-2.5 text-[12.5px] font-bold text-white transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
