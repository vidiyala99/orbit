"use client";
import { useState } from "react";
import RoomChat from "./RoomChat";
import RoomSchedule from "./RoomSchedule";
import { RoomMessageT, TimeProposalT } from "@/lib/types";

/** Narrow screens get one panel at a time behind a tab pair; from `md` up both
 *  are mounted side by side, chat in the main column and the schedule in the
 *  rail, so the tabs are hidden rather than a second layout being built. */
export default function RoomWorkspace({
  roomId,
  currentUserId,
  initialMessages,
  initialProposals,
}: {
  roomId: string;
  currentUserId: string;
  initialMessages: RoomMessageT[];
  initialProposals: TimeProposalT[];
}) {
  const [tab, setTab] = useState<"chat" | "schedule">("chat");

  function tabClass(active: boolean): string {
    return `btn-press flex-1 rounded-full px-3 py-2 text-[12.5px] font-bold transition-colors ${
      active ? "bg-ink text-ground" : "text-ink2 hover:text-ink"
    }`;
  }

  return (
    <div className="md:grid md:grid-cols-[minmax(0,1fr)_340px] md:gap-4 md:px-[18px]">
      <div className="px-[18px] pb-2 md:hidden" role="tablist" aria-label="Room panels">
        <div className="flex gap-1 rounded-full bg-surface p-1 shadow-card">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "chat"}
            onClick={() => setTab("chat")}
            className={tabClass(tab === "chat")}
          >
            Chat
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "schedule"}
            onClick={() => setTab("schedule")}
            className={tabClass(tab === "schedule")}
          >
            Find a time
          </button>
        </div>
      </div>

      <section
        data-testid="chat-panel"
        data-active={String(tab === "chat")}
        aria-label="Room chat"
        className={`rounded-card bg-ground md:block md:h-[70vh] md:bg-surface md:shadow-card ${
          tab === "chat" ? "block" : "hidden"
        }`}
      >
        <RoomChat
          roomId={roomId}
          currentUserId={currentUserId}
          initialMessages={initialMessages}
        />
      </section>

      <section
        data-testid="schedule-panel"
        data-active={String(tab === "schedule")}
        aria-label="Find a time"
        className={`rounded-card bg-ground md:block md:h-[70vh] md:overflow-y-auto md:bg-surface md:shadow-card ${
          tab === "schedule" ? "block" : "hidden"
        }`}
      >
        <RoomSchedule
          roomId={roomId}
          currentUserId={currentUserId}
          initialProposals={initialProposals}
        />
      </section>
    </div>
  );
}
