"use client";
import { useState } from "react";
import Link from "next/link";
import { attendeeName } from "@/lib/demoFixtures";
import { dm_payload, note_payload, writeClipboard } from "@/lib/contactCopy";
import type { AttendeeT } from "@/lib/types";
import { ChevronLeftIcon } from "./SocialIcons";

function initials(row: AttendeeT): string {
  return `${row.first_name[0] ?? ""}${row.last_name[0] ?? ""}`.toUpperCase();
}

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

  const shared = "btn-press min-h-12 min-w-0 flex-1 rounded-full px-5 py-3 text-[15px] font-bold";
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

const FIELDS: { key: keyof AttendeeT["note"]; label: string }[] = [
  { key: "where_met", label: "Where you met" },
  { key: "what_talked", label: "What you talked about" },
  { key: "why", label: "Why it matters" },
];

export default function ContactNote({ attendee }: { attendee: AttendeeT }) {
  const name = attendeeName(attendee);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-ground px-6 pb-16 pt-4">
      <Link
        href="/attendees"
        aria-label="Back to attendees"
        className="btn-press -ml-2 flex h-11 w-11 items-center justify-center text-ink"
      >
        <ChevronLeftIcon />
      </Link>

      <article className="mt-2 overflow-hidden rounded-card bg-surface shadow-card">
        <header className="flex items-start gap-4 px-6 py-6">
          {attendee.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={attendee.avatar_url}
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[15px] font-bold text-accent"
            >
              {initials(attendee)}
            </span>
          )}
          <div className="min-w-0 pt-1">
            <h1 className="text-[20px] font-extrabold leading-tight tracking-[-0.2px] text-ink">
              {name}
            </h1>
            <p className="mt-2 text-[14px] font-medium leading-snug text-ink2">{attendee.role}</p>
            <p className="mt-2 text-[13px] font-medium text-ink3">
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

        <div className="flex flex-col gap-6 border-t border-rule px-6 py-6">
          {FIELDS.map((field) => (
            <section key={field.key}>
              <h2 className="text-[14px] font-bold text-ink">{field.label}</h2>
              <p
                className={
                  field.key === "why"
                    ? "mt-2 font-mono text-[14px] italic leading-relaxed text-ink2"
                    : "mt-2 text-[15px] font-medium leading-relaxed text-ink2"
                }
              >
                {attendee.note[field.key]}
              </p>
            </section>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-rule px-6 py-6">
          <div className="flex gap-3">
            <CopyButton label="Copy note" text={note_payload(attendee)} variant="primary" />
            <CopyButton label="Copy DM" text={dm_payload(attendee)} variant="secondary" />
          </div>
          <p className="text-center text-[13px] font-medium leading-snug text-ink3">
            Swap primary anytime — note or DM.
          </p>
        </div>
      </article>
    </main>
  );
}
