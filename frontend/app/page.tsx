import type { ReactNode } from "react";
import Link from "next/link";
import { APP_HOME } from "@/lib/routes";

const H1 = "You shouldn't have to babysit follow-ups.";
const SUB = "Personal communications manager - memory that closes the loop.";
const CAPTION = "Your desk - not another draft box.";

const PROOFS = [
  {
    icon: "bookmark" as const,
    text: "Remembers where you met + why it matters.",
  },
  {
    icon: "list" as const,
    text: "Queues who Needs you first.",
  },
  {
    icon: "pencil" as const,
    text: "Prepares Copy note / Copy DM you approve.",
  },
];

const ROWS = [
  {
    name: "Maya Chen",
    met: "Met at Design League · Apr 12",
    avatar: "maya" as const,
  },
  {
    name: "Arjun Patel",
    met: "Met at Systems Dinner · May 3",
    avatar: "arjun" as const,
  },
  {
    name: "Elise Moreau",
    met: "Met at Research Forum · May 19",
    avatar: "elise" as const,
  },
];

function OrbitMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="shrink-0">
      <circle cx="11" cy="11" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.35" />
      <ellipse
        cx="11"
        cy="11"
        rx="9.2"
        ry="3.35"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        transform="rotate(-22 11 11)"
      />
    </svg>
  );
}

function IconCircle({
  children,
  testId,
}: {
  children: ReactNode;
  testId?: string;
}) {
  return (
    <span
      data-testid={testId}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-nearink text-nearink"
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

function BookmarkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M4.4 2.6h7.2c.4 0 .7.3.7.7v10.1L8 10.7l-4.3 2.7V3.3c0-.4.3-.7.7-.7Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="3.2" cy="4" r="0.85" fill="currentColor" />
      <circle cx="3.2" cy="8" r="0.85" fill="currentColor" />
      <circle cx="3.2" cy="12" r="0.85" fill="currentColor" />
      <path d="M5.6 4h7.2M5.6 8h7.2M5.6 12h7.2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M10.4 3.1 12.9 5.6 6 12.5H3.5V10l6.9-6.9Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path d="M9.1 4.4 11.6 6.9" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function ProofIcon({ name }: { name: (typeof PROOFS)[number]["icon"] }) {
  if (name === "bookmark") {
    return (
      <IconCircle testId="proof-icon-bookmark">
        <BookmarkIcon />
      </IconCircle>
    );
  }
  if (name === "list") {
    return (
      <IconCircle>
        <ListIcon />
      </IconCircle>
    );
  }
  return (
    <IconCircle>
      <PencilIcon />
    </IconCircle>
  );
}

function LineAvatar({ who }: { who: (typeof ROWS)[number]["avatar"] }) {
  if (who === "maya") {
    return (
      <svg viewBox="0 0 40 40" className="h-11 w-11 shrink-0" aria-hidden="true">
        <circle cx="20" cy="20" r="19" fill="#fff" stroke="currentColor" strokeWidth="1.2" />
        <path
          d="M10 23c.6-7.4 4-12.2 10-12.2S29.4 15.6 30 23"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path d="M12.2 17.2c1.8-3.4 4.2-5.2 7.8-5.2s6 1.8 7.8 5.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="16.2" cy="20.4" r="0.7" fill="currentColor" />
        <circle cx="23.8" cy="20.4" r="0.7" fill="currentColor" />
        <path d="M18.6 24.2c.8.8 2 .8 2.8 0" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    );
  }
  if (who === "arjun") {
    return (
      <svg viewBox="0 0 40 40" className="h-11 w-11 shrink-0" aria-hidden="true">
        <circle cx="20" cy="20" r="19" fill="#fff" stroke="currentColor" strokeWidth="1.2" />
        <path
          d="M11.4 22.6c.4-6.8 3.8-10.8 8.6-10.8s8.2 4 8.6 10.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path d="M13 16.4c1.6-2.6 3.6-3.8 7-3.8s5.4 1.2 7 3.8" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M14.8 20.2h3.2M22 20.2h3.2" fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
        <path d="M14.6 22.2c.4 1.4 1.2 2.4 2.6 2.4" fill="none" stroke="currentColor" strokeWidth="1.1" />
        <path d="M25.4 22.2c-.4 1.4-1.2 2.4-2.6 2.4" fill="none" stroke="currentColor" strokeWidth="1.1" />
        <path d="M18.8 25.4c.7.6 1.7.6 2.4 0" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 40" className="h-11 w-11 shrink-0" aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="#fff" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M9.8 24.2C10.6 14 14.4 9.6 20 9.6c5.6 0 9.4 4.4 10.2 14.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M11 18c1.4-4.6 4.4-7 9-7s7.6 2.4 9 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <circle cx="16.4" cy="20.8" r="0.7" fill="currentColor" />
      <circle cx="23.6" cy="20.8" r="0.7" fill="currentColor" />
      <path d="M18.7 24.6c.8.7 1.8.7 2.6 0" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export default function Page() {
  return (
    <main className="min-h-dvh bg-parchment text-nearink">
      <header className="mx-auto flex max-w-[1120px] items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2.5 font-serif text-[22px] leading-none tracking-[-0.3px]">
          <span>Orbit</span>
          <OrbitMark />
        </Link>
        <nav className="flex items-center gap-3 sm:gap-4" aria-label="Primary">
          <Link
            href={APP_HOME}
            className="btn-press inline-flex min-h-11 items-center justify-center border border-nearink bg-transparent px-4 font-mono text-[13px] text-nearink"
          >
            Open app
          </Link>
          <Link
            href={APP_HOME}
            className="btn-press inline-flex min-h-11 items-center justify-center bg-lake px-5 font-mono text-[13px] text-white hover:bg-lake/90"
          >
            Try it
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-[1120px] items-center gap-12 px-6 pb-20 pt-6 sm:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:pt-10">
        <div className="max-w-[520px]">
          <h1 className="font-serif text-[40px] leading-[1.12] tracking-[-0.6px] sm:text-[48px]">
            {H1}
          </h1>
          <div className="mt-6 h-px w-full bg-nearink" />
          <p className="mt-6 font-mono text-[14px] leading-relaxed sm:text-[15px]">{SUB}</p>
          <ul className="mt-8">
            {PROOFS.map((proof, index) => (
              <li
                key={proof.text}
                className={`flex items-center gap-4 py-4 ${index === 0 ? "border-t border-dotted border-nearink/70" : ""} border-b border-dotted border-nearink/70`}
              >
                <ProofIcon name={proof.icon} />
                <p className="font-mono text-[13px] leading-snug sm:text-[14px]">{proof.text}</p>
              </li>
            ))}
          </ul>
        </div>

        <figure className="min-w-0">
          <div
            data-testid="needs-you-desk"
            className="rounded-[22px] bg-desk-wash px-5 py-6 sm:px-7 sm:py-7"
          >
            <div className="flex items-baseline justify-between gap-4 font-mono">
              <p className="text-[15px] font-medium">Needs you</p>
              <p className="text-[12px] sm:text-[13px]">3 people · sorted by priority</p>
            </div>
            <div className="mt-3 h-px bg-nearink" />
            <ul className="mt-5 flex flex-col gap-3">
              {ROWS.map((row) => (
                <li
                  key={row.name}
                  className="flex flex-wrap items-center gap-3 rounded-[12px] bg-white px-3 py-3 sm:flex-nowrap sm:px-4"
                >
                  <LineAvatar who={row.avatar} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[14px] font-medium">{row.name}</p>
                    <p className="mt-1 truncate font-mono text-[12px]">{row.met}</p>
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    <span className="inline-flex items-center bg-lake px-3 py-1.5 font-mono text-[12px] text-white">
                      Copy note
                    </span>
                    <span className="inline-flex items-center border border-nearink bg-white px-3 py-1.5 font-mono text-[12px] text-nearink">
                      Copy DM
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <figcaption className="mt-6 text-center font-mono text-[12px] sm:text-[13px]">
              {CAPTION}
            </figcaption>
          </div>
        </figure>
      </section>
    </main>
  );
}
