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
    <div className="flex h-screen flex-col bg-board">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[74%] rounded-xl px-3 py-2 text-xs ${
              m.sender_id === currentUserId ? "ml-auto bg-ink text-card" : "bg-[#EFE6CF] text-ink"
            }`}
          >
            {m.body}
          </div>
        ))}
        {stamp?.confirmed && (
          <div className="my-2 text-center">
            <span className="inline-block -rotate-3 rounded-full border border-stamp bg-stamp/10 px-3 py-1 font-mono text-[10px] text-stamp">
              ● MET IN PERSON — {new Date(stamp.confirmed_at!).toLocaleDateString()}
            </span>
          </div>
        )}
        {!stamp?.confirmed && <StampButton threadId={threadId} token={token} onConfirmed={setStamp} />}
      </div>
      <div className="flex gap-2 border-t border-rule p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          className="flex-1 rounded-full bg-card px-3 py-2 text-xs text-ink"
          placeholder="Message..."
        />
        <button onClick={send} className="rounded-full bg-accent px-4 py-2 font-mono text-[10px] text-card">
          Send
        </button>
      </div>
    </div>
  );
}
