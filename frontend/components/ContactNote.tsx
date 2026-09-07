"use client";
import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { attendeeName } from "@/lib/demoFixtures";
import { dm_payload, note_payload, writeClipboard } from "@/lib/contactCopy";
import { displayAvatarUrl } from "@/lib/displayAvatar";
import type { AttendeePriorityT, AttendeeT } from "@/lib/types";
import { ChevronLeftIcon } from "./SocialIcons";

const PRIORITY_LABEL: Record<AttendeePriorityT, string> = {
  needs_you: "Needs you",
  high: "High",
  later: "Later",
};

function CopyButton({
  label,
  text,
  variant,
}: {
  label: string;
  text: string;
  variant: "primary" | "secondary";
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    await writeClipboard(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  const shared = "lift btn-press min-h-12 min-w-0 flex-1 rounded-full px-5 py-3 text-fl-base font-bold";
  const look =
    variant === "primary"
      ? "bg-accent text-white shadow-raised hover:bg-accent/90 hover:shadow-raised-hover"
      : "border border-rule bg-surface text-ink";

  return (
    <button type="button" onClick={onCopy} className={`${shared} ${look}`}>
      {copied ? "Copied" : label}
    </button>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
      <path
        d="M8 14.2s5-4.4 5-8.4a5 5 0 1 0-10 0c0 4 5 8.4 5 8.4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="5.8" r="1.7" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
      <path
        d="M2 3.4h12v7.2H6.6L3.4 13v-2.4H2V3.4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
      <path
        d="M8 1.4 9.3 5.7 13.6 8 9.3 10.3 8 14.6 6.7 10.3 2.4 8l4.3-2.3L8 1.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

function FieldIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ground text-accent">
      {children}
    </span>
  );
}

const FIELDS: { key: keyof AttendeeT["note"]; label: string; icon: ReactNode }[] = [
  { key: "where_met", label: "Where you met", icon: <PinIcon /> },
  { key: "what_talked", label: "What you talked about", icon: <ChatIcon /> },
  { key: "why", label: "Why it matters", icon: <SparkIcon /> },
];

/** The card content alone — reused by the full-page mobile route and the
 *  desktop split-view detail pane. Neither wraps its own back link or page
 *  shell, so a caller can drop it into either context unchanged. */
export function ContactNoteCard({ attendee }: { attendee: AttendeeT }) {
  const name = attendeeName(attendee);

  return (
    <article
      style={{ animation: "paneIn 220ms ease-out both" }}
      className="overflow-hidden rounded-card bg-surface shadow-card"
    >
      <header className="flex items-start gap-4 bg-accent-soft px-6 py-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attendee.avatar_url ?? displayAvatarUrl(attendee.id, 160)}
          alt=""
          width={80}
          height={80}
          className="h-20 w-20 shrink-0 rounded-full object-cover ring-4 ring-surface"
        />
        <div className="min-w-0 pt-1">
          <span className="inline-flex items-center rounded-full bg-surface px-2.5 py-0.5 text-fl-xs font-bold uppercase tracking-[0.03em] text-accent">
            {PRIORITY_LABEL[attendee.priority]}
          </span>
          <h1 className="mt-1.5 text-fl-xl font-extrabold leading-tight tracking-[-0.2px] text-ink">
            {name}
          </h1>
          <p className="mt-1 text-fl-base font-medium leading-snug text-ink2">{attendee.role}</p>
          <p className="mt-2 text-fl-sm font-medium text-ink3">
            <a
              href={attendee.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="text-ink3 hover:text-accent"
            >
              LI
            </a>
            <span aria-hidden="true" className="px-2">
              ·
            </span>
            <a
              href={attendee.x_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink3 hover:text-accent"
            >
              X
            </a>
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-5 border-t border-rule px-6 py-6">
        {FIELDS.map((field) =>
          field.key === "why" ? (
            <section key={field.key} className="flex gap-3">
              <FieldIcon>{field.icon}</FieldIcon>
              <div className="min-w-0 flex-1 rounded-card bg-accent-soft px-4 py-3">
                <h2 className="text-fl-sm font-bold uppercase tracking-[0.02em] text-accent">
                  {field.label}
                </h2>
                <p className="mt-1 font-mono text-fl-base italic leading-relaxed text-ink">
                  {attendee.note[field.key]}
                </p>
              </div>
            </section>
          ) : (
            <section key={field.key} className="flex gap-3">
              <FieldIcon>{field.icon}</FieldIcon>
              <div className="min-w-0 flex-1">
                <h2 className="text-fl-sm font-bold uppercase tracking-[0.02em] text-ink3">
                  {field.label}
                </h2>
                <p className="mt-1 text-fl-md font-medium leading-relaxed text-ink2">
                  {attendee.note[field.key]}
                </p>
              </div>
            </section>
          ),
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-rule px-6 py-6">
        <div className="flex gap-3">
          <CopyButton label="Copy note" text={note_payload(attendee)} variant="primary" />
          <CopyButton label="Copy DM" text={dm_payload(attendee)} variant="secondary" />
        </div>
        <p className="text-center text-fl-sm font-medium leading-snug text-ink3">
          Swap primary anytime — note or DM.
        </p>
      </div>
    </article>
  );
}

export default function ContactNote({ attendee }: { attendee: AttendeeT }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-ground px-6 pb-16 pt-4">
      <Link
        href="/attendees"
        aria-label="Back to attendees"
        className="btn-press -ml-2 flex h-11 w-11 items-center justify-center text-ink"
      >
        <ChevronLeftIcon />
      </Link>
      <div className="mt-2">
        <ContactNoteCard attendee={attendee} />
      </div>
    </main>
  );
}
