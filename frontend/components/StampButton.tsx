"use client";
import { useState } from "react";
import { confirmStamp } from "@/lib/api";
import { StampT } from "@/lib/types";

export default function StampButton({ threadId, token, onConfirmed }: {
  threadId: string; token: string; onConfirmed: (s: StampT) => void;
}) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    const stamp = await confirmStamp(threadId, token);
    onConfirmed(stamp);
    setPending(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="btn-press mx-auto block rounded-full border border-rule bg-surface px-4 py-2 text-[11.5px] font-semibold text-accent shadow-card transition-colors hover:border-accent hover:bg-accent-soft disabled:opacity-50"
    >
      {pending ? "Confirming..." : "We met in person"}
    </button>
  );
}
