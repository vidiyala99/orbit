"use client";
import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { attendeeName } from "@/lib/demoFixtures";
import { dm_payload, note_payload, writeClipboard } from "@/lib/contactCopy";
import { displayInitials } from "@/lib/displayAvatar";
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

  const shared = "lift btn-press min-h-10 min-w-0 flex-1 rounded-full px-4 py-2 text-fl-sm font-bold";
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
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ground text-accent">
      {children}
    </span>
  );
}

const FIELDS_POST: { key: keyof AttendeeT["note"]; label: string; icon: ReactNode }[] = [
  { key: "where_met", label: "Where you met", icon: <PinIcon /> },
  { key: "what_talked", label: "What you talked about", icon: <ChatIcon /> },
  { key: "why", label: "Why it matters", icon: <SparkIcon /> },
];

/** The card content alone — reused by the full-page mobile route and the
 *  desktop split-view detail pane. Neither wraps its own back link or page
 *  shell, so a caller can drop it into either context unchanged.
 *
 *  `preEvent` swaps the post-event memory fields (Where you met / What you
 *  talked about / Why it matters) for pre-event research fields (What they
 *  build / Why it matters / Talk to them about) — the meeting hasn't
 *  happened yet, so nothing here may claim that it has. */
export function ContactNoteCard({
  attendee,
  preEvent = false,
}: {
  attendee: AttendeeT;
  preEvent?: boolean;
}) {
  const name = attendeeName(attendee);

  return (
    <article
      style={{ animation: "paneIn 220ms ease-out both" }}
      className="overflow-hidden rounded-xl border border-rule bg-surface shadow-card"
    >
      <header className="flex items-center gap-3 bg-accent-soft px-4 py-3.5">
        {attendee.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attendee.avatar_url}
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-surface"
          />
        ) : (
          <span
            aria-hidden="true"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-fl-sm font-extrabold tracking-wide text-accent ring-2 ring-surface"
          >
            {displayInitials(name)}
          </span>
        )}
        <div className="min-w-0">
          <span className="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.03em] text-accent">
            {PRIORITY_LABEL[attendee.priority]}
          </span>
          <h1 className="mt-0.5 truncate text-fl-lg font-extrabold leading-tight tracking-[-0.2px] text-ink">
            {name}
          </h1>
          {attendee.role ? (
            <p className="mt-0.5 truncate text-fl-sm font-medium leading-snug text-ink2">{attendee.role}</p>
          ) : null}
          <p className="mt-1 text-fl-xs font-medium text-ink3">
            <a
              href={attendee.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="text-ink3 hover:text-accent"
            >
              LI
            </a>
            <span aria-hidden="true" className="px-1.5">
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

      <div className="flex flex-col gap-3 border-t border-rule px-4 py-3.5">
        {preEvent ? (
          <>
            <section className="flex gap-2.5">
              <FieldIcon><PinIcon /></FieldIcon>
              <div className="min-w-0 flex-1">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.02em] text-ink3">
                  What they build
                </h2>
                <p className="mt-0.5 text-fl-sm font-medium leading-snug text-ink2">
                  {attendee.role}
                </p>
              </div>
            </section>
            <section className="flex gap-2.5">
              <FieldIcon><SparkIcon /></FieldIcon>
              <div className="min-w-0 flex-1 rounded-lg bg-accent-soft px-3 py-2">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.02em] text-accent">
                  Why it matters
                </h2>
                <p className="mt-0.5 font-mono text-fl-sm italic leading-snug text-ink">
                  {attendee.why_meet}
                </p>
              </div>
            </section>
            {attendee.talking_points && attendee.talking_points.length > 0 ? (
              <section className="flex gap-2.5">
                <FieldIcon><ChatIcon /></FieldIcon>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.02em] text-ink3">
                    Talk to them about
                  </h2>
                  <ul className="mt-0.5 flex flex-col gap-1">
                    {attendee.talking_points.map((point, i) => (
                      <li key={i} className="text-fl-sm font-medium leading-snug text-ink2">
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            ) : null}
          </>
        ) : (
          FIELDS_POST.map((field) =>
            field.key === "why" ? (
              <section key={field.key} className="flex gap-2.5">
                <FieldIcon>{field.icon}</FieldIcon>
                <div className="min-w-0 flex-1 rounded-lg bg-accent-soft px-3 py-2">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.02em] text-accent">
                    {field.label}
                  </h2>
                  <p className="mt-0.5 font-mono text-fl-sm italic leading-snug text-ink">
                    {attendee.note[field.key]}
                  </p>
                </div>
              </section>
            ) : (
              <section key={field.key} className="flex gap-2.5">
                <FieldIcon>{field.icon}</FieldIcon>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.02em] text-ink3">
                    {field.label}
                  </h2>
                  <p className="mt-0.5 text-fl-sm font-medium leading-snug text-ink2">
                    {attendee.note[field.key]}
                  </p>
                </div>
              </section>
            ),
          )
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-rule px-4 py-3.5">
        <div className="flex gap-2">
          <CopyButton label="Copy note" text={note_payload(attendee)} variant="primary" />
          <CopyButton label="Copy DM" text={dm_payload(attendee)} variant="secondary" />
        </div>
        <p className="text-center text-[11px] font-medium leading-snug text-ink3">
          Swap primary anytime — note or DM.
        </p>
      </div>
    </article>
  );
}

export default function ContactNote({
  attendee,
  preEvent = false,
}: {
  attendee: AttendeeT;
  preEvent?: boolean;
}) {
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
        <ContactNoteCard attendee={attendee} preEvent={preEvent} />
      </div>
    </main>
  );
}
