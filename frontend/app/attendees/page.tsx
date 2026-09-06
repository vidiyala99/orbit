"use client";

import { useEffect, useState } from "react";
import AttendeeBrief from "@/components/AttendeeBrief";
import { loadDeskGuests, type DeskGuests } from "@/lib/guests";

export default function AttendeesPage() {
  const [desk, setDesk] = useState<DeskGuests | null>(null);

  useEffect(() => {
    let alive = true;
    loadDeskGuests().then((next) => {
      if (alive) setDesk(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!desk) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-5xl bg-ground px-4 pb-16 pt-5 md:px-8">
        <p className="text-[13px] font-medium text-ink3">Loading guests...</p>
      </main>
    );
  }

  return <AttendeeBrief event={desk.event} attendees={desk.attendees} />;
}
