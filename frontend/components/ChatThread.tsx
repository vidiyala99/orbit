"use client";
import { useEffect, useRef, useState } from "react";
import { wsUrl } from "@/lib/api";
import { MessageT, StampT } from "@/lib/types";
import StampButton from "./StampButton";

export default function ChatThread({
  threadId, initialMessages, currentUserId, token,
}: {
  threadId: string; initialMessages: MessageT[]; currentUserId: string; token: string;
}) {
  const [messages, setMessages] = useState<MessageT[]>(initialMessages);
  const [stamp, setStamp] = useState<StampT | null>(null);
  const [draft, setDraft] = useState("");
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(wsUrl(threadId, token));
    ws.onmessage = (event) => {
      const msg: MessageT = JSON.parse(event.data);
      setMessages((prev) => [...prev, msg]);
    };
    socketRef.current = ws;
    return () => ws.close();
  }, [threadId, token]);

  function send() {
    if (!draft.trim() || !socketRef.current) return;
    socketRef.current.send(JSON.stringify({ body: draft }));
    setDraft("");
  }

  return (
    <div className="mx-auto flex h-screen w-full max-w-md flex-col bg-ground">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[74%] px-3.5 py-2 text-[13px] font-medium leading-relaxed shadow-card ${
              m.sender_id === currentUserId
                ? "ml-auto rounded-[14px] rounded-br-[4px] bg-ink text-ground"
                : "rounded-[14px] rounded-bl-[4px] bg-surface text-ink"
            }`}
          >
            {m.body}
          </div>
        ))}
        {stamp?.confirmed && (
          <div className="my-3 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.04em] text-accent">
              ● Met in person — {new Date(stamp.confirmed_at!).toLocaleDateString()}
            </span>
          </div>
        )}
        {!stamp?.confirmed && <StampButton threadId={threadId} token={token} onConfirmed={setStamp} />}
      </div>
      <div className="flex gap-2 border-t border-rule bg-ground p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <label htmlFor="chat-draft" className="sr-only">
          Message
        </label>
        <input
          id="chat-draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          className="field flex-1 rounded-full border border-rule bg-surface px-4 py-2.5 text-[13px] text-ink placeholder:text-ink3"
          placeholder="Message…"
        />
        <button
          onClick={send}
          className="btn-press rounded-full bg-accent px-4 py-2.5 text-[12.5px] font-bold text-white transition-colors hover:bg-ink"
        >
          Send
        </button>
      </div>
    </div>
  );
}
