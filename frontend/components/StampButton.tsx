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
      className="mx-auto block rounded-full border border-stamp px-4 py-1.5 font-mono text-[10px] text-stamp"
    >
      {pending ? "Confirming..." : "We met in person"}
    </button>
  );
}
