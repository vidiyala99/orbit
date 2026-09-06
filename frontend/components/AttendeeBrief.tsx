"use client";

import { useState } from "react";
import Link from "next/link";
import { attendeeName } from "@/lib/demoFixtures";
import type { AttendeePriorityT, AttendeeT, EventBriefT } from "@/lib/types";
import { AttendeeSocials, ChevronLeftIcon, PeopleIcon, StarIcon } from "./SocialIcons";

const SEGMENTS: { id: AttendeePriorityT; label: string }[] = [
  { id: "needs_you", label: "Needs you" },
  { id: "high", label: "High" },
  { id: "later", label: "Later" },
];

const AVATAR_TONES = [
  "bg-[#3D4F3D] text-[#E8EDE4]",
  "bg-[#C4A574] text-[#2F332C]",
  "bg-[#9B8FB8] text-[#F5F3EE]",
  "bg-[#6B7A4A] text-[#F5F3EE]",
];

function initials(row: AttendeeT): string {
  return `${row.first_name[0] ?? ""}${row.last_name[0] ?? ""}`.toUpperCase();
}

function toneFor(id: string): string {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n += id.charCodeAt(i);
  return AVATAR_TONES[n % AVATAR_TONES.length];
}

function Avatar({ row }: { row: AttendeeT }) {
  if (row.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={row.avatar_url}
        alt=""
        width={24}
        height={24}
        className="h-6 w-6 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${toneFor(row.id)}`}
    >
      {initials(row)}
    </span>
  );
}

function DeskRow({ row, rank }: { row: AttendeeT; rank: number }) {
  const name = attendeeName(row);
  return (
    <li className="relative border-b border-rule last:border-b-0">
      <Link href={`/attendees/${row.id}`} className="absolute inset-0" aria-label={name} />
      <div className="flex h-11 items-center gap-2 px-2 md:h-10">
        <Avatar row={row} />
        <div className="flex min-w-0 max-w-[46%] shrink-0 items-center gap-1">
          <p className="min-w-0 truncate text-[13px] font-bold leading-none text-ink">{name}</p>
          <span aria-hidden="true" className="text-[12px] text-ink3">
            |
          </span>
          <p className="min-w-0 truncate text-[12px] font-medium leading-none text-ink2">{row.role}</p>
          <AttendeeSocials name={name} linkedinUrl={row.linkedin_url} xUrl={row.x_url} dense />
        </div>
        <p
          title={row.why_meet}
          className="min-w-0 flex-1 truncate font-mono text-[11px] italic leading-none text-ink2"
        >
          {row.why_meet}
        </p>
        <p className="tabular shrink-0 text-[12px] font-semibold leading-none text-ink">#{rank}</p>
      </div>
    </li>
  );
}

export default function AttendeeBrief({
  event,
  attendees,
  backHref = "/",
}: {
  event: EventBriefT;
  attendees: AttendeeT[];
  backHref?: string;
}) {
  const [segment, setSegment] = useState<AttendeePriorityT>("needs_you");
  const count = attendees.length;
  const rows = attendees.filter((row) => row.priority === segment);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl bg-ground px-2 pb-16 pt-4 md:px-6">
      <header className="flex items-center gap-2 pb-4 md:gap-3">
        <Link
          href={backHref}
          aria-label="Back"
          className="btn-press -ml-1 flex h-11 w-11 shrink-0 items-center justify-center text-ink"
        >
          <ChevronLeftIcon />
        </Link>
        <div className="min-w-0">
          <h1 className="text-[20px] font-extrabold leading-tight tracking-[-0.3px] text-ink md:text-[22px]">
            {event.title}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-ink2">
            <PeopleIcon />
            <span>
              {event.datetime}, {count} {count === 1 ? "guest" : "guests"}
            </span>
          </p>
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Priority"
        className="mb-3 grid grid-cols-3 overflow-hidden rounded-[10px] border border-rule bg-surface"
      >
        {SEGMENTS.map((item) => {
          const selected = segment === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setSegment(item.id)}
              className={
                selected
                  ? "h-9 bg-accent text-[13px] font-bold text-white"
                  : "h-9 text-[13px] font-medium text-ink3"
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div data-testid="priority-desk" className="overflow-hidden rounded-[10px] border border-rule bg-surface">
        {rows.length === 0 ? (
          <p className="px-3 py-3 text-[13px] font-medium text-ink3">No one in this list.</p>
        ) : (
          <ul className="max-h-[calc(5*2.75rem)] overflow-y-auto md:max-h-[calc(5*2.5rem)]">
            {rows.map((row, i) => (
              <DeskRow key={row.id} row={row} rank={i + 1} />
            ))}
          </ul>
        )}
      </div>

      <p className="mt-4 flex items-center gap-2 text-[12px] font-medium text-ink3">
        <StarIcon />
        <span>Manager surfaces who matters first.</span>
      </p>
    </main>
  );
}
