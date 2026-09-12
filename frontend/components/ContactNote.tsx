"use client";
import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { attendeeName } from "@/lib/demoFixtures";
import { dm_payload, note_payload, writeClipboard } from "@/lib/contactCopy";
import { displayInitials } from "@/lib/displayAvatar";
import type { AttendeePriorityT, AttendeeT } from "@/lib/types";
import { APP_INBOX } from "@/lib/routes";
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

  const shared =
    "btn-press min-h-11 min-w-0 flex-1 rounded-md px-4 text-fl-sm font-bold transition-colors duration-150";
  const look =
    variant === "primary"
      ? "bg-accent font-display text-white shadow-sm hover:bg-accent-deep"
      : "border border-ink/15 bg-surface-raised text-ink hover:bg-ink/[0.04]";

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
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ink/[0.06] text-ink2">
      {children}
    </span>
  );
}

/** Same chip language as Focus — words, ≥44px. */
function SocialChips({
  name,
  linkedinUrl,
  xUrl,
  className = "",
}: {
  name: string;
  linkedinUrl?: string | null;
  xUrl?: string | null;
  className?: string;
}) {
  const linkedin = linkedinUrl?.trim() || null;
  const x = xUrl?.trim() || null;
  if (!linkedin && !x) return null;
  const chip =
    "btn-press inline-flex min-h-11 items-center rounded-md border border-ink/15 bg-surface-raised px-4 text-[0.8125rem] font-semibold text-ink2 transition-colors hover:bg-ink/[0.05] hover:text-ink";
  return (
    <div className={["flex flex-wrap items-center gap-2", className].filter(Boolean).join(" ")}>
      {linkedin ? (
        <a
          href={linkedin}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${name} on LinkedIn`}
          className={chip}
        >
          LinkedIn
        </a>
      ) : null}
      {x ? (
        <a href={x} target="_blank" rel="noopener noreferrer" aria-label={`${name} on X`} className={chip}>
          X
        </a>
      ) : null}
    </div>
  );
}

function FieldBlock({
  label,
  icon,
  children,
  highlight = false,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
  highlight?: boolean;
}) {
  return (
    <section className="flex gap-2.5">
      <FieldIcon>{icon}</FieldIcon>
      <div
        className={
          highlight
            ? "min-w-0 flex-1 rounded-md border-l-2 border-accent bg-accent-soft/50 px-3 py-2"
            : "min-w-0 flex-1"
        }
      >
        <h2 className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-ink3">
          {label}
        </h2>
        <div className="mt-0.5 text-fl-sm font-medium leading-snug text-ink">{children}</div>
      </div>
    </section>
  );
}

function hasText(value: string | null | undefined): boolean {
  return !!value?.trim();
}

/** The card content alone — reused by the full-page person route and the
 *  desktop split-view detail pane. Neither wraps its own back link or page
 *  shell, so a caller can drop it into either context unchanged.
 *
 *  `preEvent` swaps the post-event memory fields (Where you met / What you
 *  talked about / Why it matters) for pre-event research fields (What they
 *  build / Why it matters / Talk to them about) — the meeting hasn't
 *  happened yet, so nothing here may claim that it has.
 *
 *  `layout="page"`: phone stacks; md+ uses a wide two-column person sheet.
 *  `"pane"` stays compact for the desk detail rail. */
export function ContactNoteCard({
  attendee,
  preEvent = false,
  layout = "pane",
}: {
  attendee: AttendeeT;
  preEvent?: boolean;
  layout?: "pane" | "page";
}) {
  const name = attendeeName(attendee);
  const page = layout === "page";
  const reduceMotion = useReducedMotion();

  const fieldNodes: ReactNode[] = [];
  if (preEvent) {
    if (hasText(attendee.role)) {
      fieldNodes.push(
        <FieldBlock key="build" label="What they build" icon={<PinIcon />}>
          {attendee.role}
        </FieldBlock>,
      );
    }
    if (hasText(attendee.why_meet)) {
      fieldNodes.push(
        <FieldBlock key="why" label="Why it matters" icon={<SparkIcon />} highlight>
          <span className="font-mono italic leading-snug">{attendee.why_meet}</span>
        </FieldBlock>,
      );
    }
    if (attendee.talking_points && attendee.talking_points.length > 0) {
      fieldNodes.push(
        <FieldBlock key="talk" label="Talk to them about" icon={<ChatIcon />}>
          <ul className="flex flex-col gap-1">
            {attendee.talking_points.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </FieldBlock>,
      );
    }
  } else {
    if (hasText(attendee.note.where_met)) {
      fieldNodes.push(
        <FieldBlock key="where" label="Where you met" icon={<PinIcon />}>
          {attendee.note.where_met}
        </FieldBlock>,
      );
    }
    if (hasText(attendee.note.what_talked)) {
      fieldNodes.push(
        <FieldBlock key="talked" label="What you talked about" icon={<ChatIcon />}>
          {attendee.note.what_talked}
        </FieldBlock>,
      );
    }
    if (hasText(attendee.note.why)) {
      fieldNodes.push(
        <FieldBlock key="why" label="Why it matters" icon={<SparkIcon />} highlight>
          <span className="font-mono italic leading-snug">{attendee.note.why}</span>
        </FieldBlock>,
      );
    }
  }

  const socialProps = {
    name,
    linkedinUrl: attendee.linkedin_url,
    xUrl: attendee.x_url,
  };

  /** Phone: under identity. Desktop page: in the act footer next to Copy. Pane: under identity. */
  const identity = (
    <div className="min-w-0">
      <span className="inline-flex items-center rounded-md bg-ink/[0.08] px-2 py-0.5 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.06em] text-ink2">
        {PRIORITY_LABEL[attendee.priority]}
      </span>
      <h1
        className={[
          "mt-1.5 font-display font-bold leading-tight tracking-[-0.035em] text-ink",
          page ? "text-[1.375rem] md:text-[1.75rem]" : "text-fl-lg",
        ].join(" ")}
      >
        {name}
      </h1>
      {hasText(attendee.role) ? (
        <p
          className={[
            "mt-1 font-medium leading-snug text-ink2",
            page ? "text-fl-base md:whitespace-normal" : "truncate text-fl-sm",
          ].join(" ")}
        >
          {attendee.role}
        </p>
      ) : null}
      <SocialChips
        {...socialProps}
        className={page ? "mt-3 md:hidden" : "mt-3"}
      />
    </div>
  );

  const actions = (
    <div className="flex flex-col gap-2.5">
      {page ? (
        <SocialChips {...socialProps} className="hidden md:flex" />
      ) : null}
      <div className="flex gap-2">
        <CopyButton label="Copy note" text={note_payload(attendee)} variant="primary" />
        <CopyButton label="Copy DM" text={dm_payload(attendee)} variant="secondary" />
      </div>
      <p className="text-center text-[11px] font-medium leading-snug text-ink3 md:text-left">
        Swap primary anytime — note or DM.
      </p>
    </div>
  );

  const enterStyle = reduceMotion
    ? undefined
    : { animation: "paneIn 180ms ease-out both" };

  if (!page) {
    return (
      <article
        style={enterStyle}
        className="overflow-hidden rounded-md border border-ink/10 bg-surface-raised shadow-sm"
      >
        <header className="flex items-start gap-3 border-b border-ink/[0.06] px-4 py-3.5">
          {attendee.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={attendee.avatar_url}
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink/[0.08] text-fl-sm font-bold text-ink2"
            >
              {displayInitials(name)}
            </span>
          )}
          {identity}
        </header>
        <div className="flex flex-col gap-3.5 px-4 py-3.5">
          {fieldNodes.length > 0 ? (
            fieldNodes
          ) : (
            <p className="text-fl-sm font-medium text-ink3">No notes yet.</p>
          )}
        </div>
        <div className="border-t border-ink/[0.06] px-4 py-3.5">{actions}</div>
      </article>
    );
  }

  return (
    <article
      style={enterStyle}
      className="overflow-hidden rounded-md border border-ink/10 bg-surface-raised shadow-sm md:grid md:grid-cols-[minmax(220px,0.38fr)_minmax(0,1fr)]"
    >
      <header className="flex items-start gap-3 border-b border-ink/[0.06] px-5 py-5 md:flex-col md:items-stretch md:gap-4 md:border-b-0 md:border-r md:border-ink/[0.06] md:px-6 md:py-6">
        {attendee.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attendee.avatar_url}
            alt=""
            width={280}
            height={280}
            className="h-16 w-16 shrink-0 rounded-full object-cover object-top md:aspect-[4/5] md:h-auto md:w-full md:rounded-md"
          />
        ) : (
          <span
            aria-hidden="true"
            className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-ink/[0.08] text-fl-lg font-bold text-ink2 md:aspect-[4/5] md:h-auto md:w-full md:rounded-md md:text-fl-2xl"
          >
            {displayInitials(name)}
          </span>
        )}
        {identity}
      </header>
      <div className="flex min-w-0 flex-col">
        <div className="flex flex-1 flex-col gap-3.5 px-5 py-5 md:px-6 md:py-6">
          {fieldNodes.length > 0 ? (
            fieldNodes
          ) : (
            <p className="text-fl-sm font-medium text-ink3">No notes yet.</p>
          )}
        </div>
        <div className="border-t border-ink/[0.06] px-5 py-4 md:px-6">{actions}</div>
      </div>
    </article>
  );
}

export default function ContactNote({
  attendee,
  preEvent = false,
  backHref = APP_INBOX,
  backLabel = "Back to Inbox",
}: {
  attendee: AttendeeT;
  preEvent?: boolean;
  /** Where the chevron returns — Home when opened from Focus, Inbox from Keep. */
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <main className="home-stage mx-auto h-full w-full max-w-[1240px] overflow-y-auto px-4 pb-10 pt-3 md:px-8 md:pt-5 lg:px-10">
      <Link
        href={backHref}
        aria-label={backLabel}
        className="btn-press -ml-1 inline-flex h-11 w-11 items-center justify-center rounded-md text-ink hover:bg-ink/[0.05]"
      >
        <ChevronLeftIcon />
      </Link>
      <div className="mt-2 w-full">
        <ContactNoteCard attendee={attendee} preEvent={preEvent} layout="page" />
      </div>
    </main>
  );
}
