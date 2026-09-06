"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import ContactNote from "@/components/ContactNote";
import { findDeskAttendee, loadDeskGuests } from "@/lib/guests";
import type { AttendeeT } from "@/lib/types";

export default function ContactNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [attendee, setAttendee] = useState<AttendeeT | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    loadDeskGuests().then((desk) => {
      if (!alive) return;
      setAttendee(findDeskAttendee(id, desk.attendees) ?? null);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  if (attendee === undefined) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md bg-ground px-6 pb-16 pt-4">
        <p className="text-[13px] font-medium text-ink3">Loading guests...</p>
      </main>
    );
  }

  if (!attendee) notFound();

  return <ContactNote attendee={attendee} />;
}
