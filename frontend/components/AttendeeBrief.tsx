"use client";

import { useState } from "react";
import Link from "next/link";
import { attendeeName } from "@/lib/demoFixtures";
import { attendeeEmail, dm_payload, note_payload, writeClipboard } from "@/lib/contactCopy";
import type { AttendeePriorityT, AttendeeT, EventBriefT } from "@/lib/types";
import { AttendeeSocials, ChevronLeftIcon } from "./SocialIcons";

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

function RowCopyButton({
  label,
  short,
  text,
  variant,
}: {
  label: string;
  short: string;
  text: string;
  variant: "primary" | "secondary";
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await writeClipboard(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  const look =
    variant === "primary"
      ? "bg-accent text-white"
      : "border border-ink bg-surface text-ink";

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={label}
      className={`btn-press relative z-10 h-7 shrink-0 rounded-full px-2.5 text-[11px] font-bold ${look}`}
    >
      <span className="md:hidden">{copied ? "Copied" : short}</span>
      <span className="hidden md:inline">{copied ? "Copied" : label}</span>
    </button>
  );
}

function NeedsYouActions({ row }: { row: AttendeeT }) {
  return (
    <div className="relative z-10 flex shrink-0 items-center gap-1.5">
      <RowCopyButton
        label="Copy note"
        short="Note"
        text={note_payload(row)}
        variant="primary"
      />
      <RowCopyButton
        label="Copy DM"
        short="DM"
        text={dm_payload(row)}
        variant="secondary"
      />
      <a
        href={`mailto:${attendeeEmail(row)}`}
        className="hidden text-[12px] font-medium text-ink hover:text-accent md:inline"
        onClick={(e) => e.stopPropagation()}
      >
        Email
      </a>
    </div>
  );
}

function DeskRow({ row, rank }: { row: AttendeeT; rank: number }) {
  const name = attendeeName(row);
  const needsYou = row.priority === "needs_you";
  return (
    <li className="relative border-b border-rule last:border-b-0">
      <Link href={`/attendees/${row.id}`} className="absolute inset-0" aria-label={name} />
      <div className="flex min-h-12 items-center gap-2 px-2 py-1.5 md:min-h-12">
        <span className="order-1">
          <Avatar row={row} />
        </span>
        <div className="order-2 min-w-0 flex-1 md:w-[180px] md:flex-none">
          <p className="truncate text-[13px] font-bold leading-none text-ink">{name}</p>
          <p className="mt-0.5 truncate text-[11px] font-medium leading-none text-ink2">{row.role}</p>
          <p
            title={row.why_meet}
            className="mt-0.5 truncate font-mono text-[11px] italic leading-none text-ink2 md:hidden"
          >
            {row.why_meet}
          </p>
        </div>
        <span className="order-3">
          <AttendeeSocials
            name={name}
            linkedinUrl={row.linkedin_url}
            xUrl={row.x_url}
            showLinkedIn={row.linkedin_connected}
            showX={row.x_interacted}
            dense
          />
        </span>
        <p
          title={row.why_meet}
          className="order-4 hidden min-w-0 flex-1 truncate font-mono text-[11px] italic leading-none text-ink2 md:block"
        >
          {row.why_meet}
        </p>
        <p className="order-4 tabular shrink-0 text-[12px] font-semibold leading-none text-ink md:order-6">
          #{rank}
        </p>
        {needsYou ? (
          <div className="order-5">
            <NeedsYouActions row={row} />
          </div>
        ) : null}
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
      <header className="flex items-center gap-2 pb-3 md:gap-3">
        <Link
          href={backHref}
          aria-label="Back"
          className="btn-press -ml-1 flex h-11 w-11 shrink-0 items-center justify-center text-ink"
        >
          <ChevronLeftIcon />
        </Link>
        <h1 className="text-[20px] font-extrabold leading-tight tracking-[-0.3px] text-ink md:text-[22px]">
          {event.title}
        </h1>
        <p className="text-[13px] font-medium text-ink2">
          {event.datetime} · {count} {count === 1 ? "guest" : "guests"}
        </p>
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
                  ? "flex h-9 items-center justify-center gap-1.5 bg-accent-soft text-[13px] font-bold text-ink"
                  : "h-9 text-[13px] font-medium text-ink3"
              }
            >
              {item.label}
              {selected ? (
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
              ) : null}
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
    </main>
  );
}
