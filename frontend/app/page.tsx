import Link from "next/link";
import type { ReactNode } from "react";
import MarketingNav from "@/components/MarketingNav";
import Reveal from "@/components/Reveal";
import { APP_HOME } from "@/lib/routes";
import { FIXTURE_ATTENDEES, attendeeName } from "@/lib/demoFixtures";

const H1 = "Know who to meet before you walk in.";
const SUB = "Orbit reads the guest list of the Luma events you're going to and ranks every attendee against your Focus.";
const CAPTION = "Ranked for your Focus. You keep or skip.";

/** The demo user's Focus, shown as an example. Matches the fixture guests,
 *  who are all building agent infrastructure. */
const EXAMPLE_FOCUS = {
  role: "Founder, agent eval tooling",
  struggle: "Finding design partners who run evals in production",
};

const PROOFS = [
  { icon: "list" as const, text: "Pulls the guest list from your Luma events." },
  { icon: "target" as const, text: "Ranks each attendee against your Focus, with the evidence." },
  { icon: "inbox" as const, text: "The people you keep wait in your Inbox." },
];

/** Display-only headshots for the marketing preview. Fixture rows carry
 *  avatar_url: null, so this maps a few fixed ids to stable placeholder
 *  photos and the landing page shows faces, not initials. */
const MARKETING_AVATARS: Record<string, string> = {
  "alex-chen": "https://i.pravatar.cc/96?img=12",
  "marcus-ellis": "https://i.pravatar.cc/96?img=33",
  "priya-raman": "https://i.pravatar.cc/96?img=47",
};

/** The marketing page's copy-ban is stricter than the fixtures' own voice,
 *  so em dashes are swapped for display only. */
function withoutEmDashes(text: string): string {
  return text.replace(/\s*—\s*/g, ", ");
}

const RANKED = FIXTURE_ATTENDEES.slice(0, 3).map((row) => ({
  id: row.id,
  name: attendeeName(row),
  role: row.role,
  why: withoutEmDashes(row.why_meet),
  avatar: MARKETING_AVATARS[row.id],
}));

const ALEX = FIXTURE_ATTENDEES.find((row) => row.id === "alex-chen") ?? FIXTURE_ATTENDEES[0];
const ALEX_EVIDENCE = withoutEmDashes(ALEX.evidence[0]?.quote ?? "Shipping a first-class agent runtime.");

function OrbitMark({ className = "" }: { className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className={`shrink-0 ${className}`}>
      <circle cx="11" cy="11" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.35" />
      <ellipse cx="11" cy="11" rx="9.2" ry="3.35" fill="none" stroke="currentColor" strokeWidth="1.35" transform="rotate(-22 11 11)" />
    </svg>
  );
}

function IconCircle({ children }: { children: ReactNode }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rule bg-surface text-accent"
      aria-hidden="true"
    >
      {children}
    </span>
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

function TargetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="5.6" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="8" cy="8" r="2.6" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="8" cy="8" r="0.8" fill="currentColor" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2.6 9.2 4.2 3.6h7.6l1.6 5.6v3.2H2.6V9.2Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      <path d="M2.6 9.2h3l.8 1.4h3.2l.8-1.4h3" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
    </svg>
  );
}

function ProofIcon({ name }: { name: (typeof PROOFS)[number]["icon"] }) {
  if (name === "list") return <IconCircle><ListIcon /></IconCircle>;
  if (name === "target") return <IconCircle><TargetIcon /></IconCircle>;
  return <IconCircle><InboxIcon /></IconCircle>;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

const AVATAR_SIZES = {
  sm: { px: 24, box: "h-6 w-6 text-[9px]" },
  md: { px: 40, box: "h-10 w-10 text-fl-sm" },
};

function Avatar({ name, src, size }: { name: string; src?: string; size: keyof typeof AVATAR_SIZES }) {
  const { px, box } = AVATAR_SIZES[size];
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={px} height={px} className={`${box} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <span aria-hidden="true" className={`${box} flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-bold text-accent`}>
      {initials(name)}
    </span>
  );
}

function DecisionChips() {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="inline-flex items-center rounded-full border border-rule bg-surface px-3 py-1.5 text-fl-xs font-bold text-ink">Skip</span>
      <span className="inline-flex items-center rounded-full bg-accent px-3 py-1.5 text-fl-xs font-bold text-white">Keep</span>
    </div>
  );
}

function DemoLink({ className }: { className: string }) {
  return (
    <Link
      href={APP_HOME}
      className={`lift btn-press inline-flex min-h-11 items-center justify-center rounded-full bg-accent text-fl-base font-bold text-white hover:bg-accent/90 ${className}`}
    >
      Try the demo
    </Link>
  );
}

export default function Page() {
  return (
    <main className="min-h-dvh bg-ground text-ink">
      <div className="grain-overlay" aria-hidden="true" />
      <MarketingNav />

      {/* 1. Hero - promise left, ranked preview right */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.18fr)] lg:gap-14 lg:px-8 lg:pt-16">
        <div className="max-w-[540px]">
          <h1
            style={{ animation: "riseIn 550ms cubic-bezier(0.16,1,0.3,1) 40ms both" }}
            className="font-display text-fl-hero font-bold tracking-[-0.6px] text-balance"
          >
            {H1}
          </h1>
          <p
            style={{ animation: "riseIn 550ms cubic-bezier(0.16,1,0.3,1) 140ms both" }}
            className="mt-4 max-w-[46ch] text-fl-md font-medium leading-relaxed text-ink2 text-pretty"
          >
            {SUB}
          </p>
          <div
            style={{ animation: "riseIn 550ms cubic-bezier(0.16,1,0.3,1) 220ms both" }}
            className="mt-6 flex flex-wrap gap-3"
          >
            <DemoLink className="px-6 shadow-glow hover:shadow-glow-hover" />
          </div>
          <ul className="mt-8">
            {PROOFS.map((proof, index) => (
              <li
                key={proof.text}
                style={{ animation: `riseIn 500ms cubic-bezier(0.16,1,0.3,1) ${300 + index * 90}ms both` }}
                className={`flex items-center gap-4 py-4 ${index === 0 ? "border-t border-rule" : ""} border-b border-rule`}
              >
                <ProofIcon name={proof.icon} />
                <p className="text-fl-base font-medium leading-snug text-ink2">{proof.text}</p>
              </li>
            ))}
          </ul>
        </div>

        <figure
          style={{ animation: "riseIn 650ms cubic-bezier(0.16,1,0.3,1) 180ms both" }}
          className="min-w-0"
        >
          <div data-testid="ranked-preview" className="relative overflow-hidden rounded-hero bg-accent-soft px-5 py-6 shadow-glow sm:px-7 sm:py-7">
            <OrbitMark className="pointer-events-none absolute -right-6 -top-8 h-40 w-40 text-accent/15 sm:h-48 sm:w-48" />
            <div className="relative rounded-card bg-surface/70 px-4 py-3">
              <p className="text-fl-xs font-bold text-ink3">Your Focus</p>
              <p className="mt-1 text-fl-base font-bold leading-snug text-ink">{EXAMPLE_FOCUS.role}</p>
              <p className="mt-0.5 text-fl-sm font-medium leading-snug text-ink2">{EXAMPLE_FOCUS.struggle}</p>
            </div>
            <ol className="relative mt-4 flex flex-col gap-3">
              {RANKED.map((row, index) => (
                <li key={row.id} className="lift flex flex-wrap items-center gap-3 rounded-card bg-surface px-4 py-3.5 shadow-card sm:flex-nowrap">
                  <span aria-hidden="true" className="w-3 shrink-0 text-center text-fl-xs font-bold tabular-nums text-ink3">{index + 1}</span>
                  <Avatar name={row.name} src={row.avatar} size="md" />
                  <div className="min-w-[11rem] flex-1">
                    <p className="text-fl-base font-bold leading-tight text-ink">{row.name}</p>
                    <p className="mt-0.5 text-fl-sm font-medium leading-snug text-ink2">{row.why}</p>
                  </div>
                  <div className="ml-auto">
                    <DecisionChips />
                  </div>
                </li>
              ))}
            </ol>
            <figcaption className="relative mt-5 text-center text-fl-sm font-medium text-ink2">{CAPTION}</figcaption>
          </div>
        </figure>
      </section>

      {/* 2. Problem - full-bleed editorial statement over a photo */}
      <section className="relative overflow-hidden border-t border-rule">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://picsum.photos/seed/streetlight-door/1600/900"
          alt=""
          aria-hidden="true"
          className="kenburns h-[420px] w-full object-cover grayscale lg:h-[520px]"
        />
        <div className="absolute inset-0 bg-ink/70" aria-hidden="true" />
        <div className="absolute inset-0 flex items-center">
          <Reveal as="div" className="mx-auto max-w-2xl px-6">
            <p className="text-center font-display text-fl-2xl font-medium leading-snug text-ground text-balance">
              A guest list of two hundred names doesn&apos;t tell you which three are worth your evening.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 3. How it works, steps 1-2 - alternating split */}
      <div className="border-t border-rule bg-surface">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 py-14 md:flex-row lg:gap-16 lg:py-20">
          <Reveal className="w-full max-w-sm flex-shrink-0 rounded-card bg-ink p-5">
            <ul className="flex flex-col gap-2">
              {RANKED.map((row) => (
                <li key={row.id} className="flex items-center gap-2 rounded-card bg-surface px-2.5 py-2 shadow-card">
                  <Avatar name={row.name} src={row.avatar} size="sm" />
                  <p className="truncate text-fl-xs font-bold text-ink">{row.name}</p>
                  <p className="ml-auto truncate text-fl-xs font-medium text-ink3">{row.role}</p>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delayMs={120} className="max-w-md">
            <h2 className="font-display text-fl-xl font-semibold tracking-[-0.2px] text-ink">Pulled from your Luma</h2>
            <p className="mt-2 text-fl-md font-medium leading-relaxed text-ink2">
              Connect Luma once. Orbit brings in the guest list of every event you&apos;re going to, and the public LinkedIn and X profiles behind each name.
            </p>
          </Reveal>
        </div>
        <div className="mx-auto flex max-w-5xl flex-col-reverse items-center gap-8 border-t border-rule px-6 py-14 md:flex-row lg:gap-16 lg:py-20">
          <Reveal delayMs={120} className="max-w-md">
            <h2 className="font-display text-fl-xl font-semibold tracking-[-0.2px] text-ink">Ranked against your Focus</h2>
            <p className="mt-2 text-fl-md font-medium leading-relaxed text-ink2">
              Your Focus is what you do and what you&apos;re stuck on right now. Orbit infers it from your own profile, you confirm it in one tap, and every attendee is scored against it.
            </p>
          </Reveal>
          <Reveal className="w-full max-w-sm flex-shrink-0 rounded-card bg-ink p-5">
            <dl className="flex flex-col gap-2">
              <div className="rounded-card bg-surface px-3.5 py-3 shadow-card">
                <dt className="text-fl-xs font-bold text-ink3">Role</dt>
                <dd className="mt-0.5 text-fl-sm font-bold text-ink">{EXAMPLE_FOCUS.role}</dd>
              </div>
              <div className="rounded-card bg-surface px-3.5 py-3 shadow-card">
                <dt className="text-fl-xs font-bold text-ink3">Struggle</dt>
                <dd className="mt-0.5 text-fl-sm font-bold text-ink">{EXAMPLE_FOCUS.struggle}</dd>
              </div>
            </dl>
          </Reveal>
        </div>
      </div>

      {/* 4. How it works, step 3 - full-width spotlight on the one decision */}
      <section className="border-t border-rule bg-ink px-6 py-16 text-center lg:py-24">
        <Reveal>
          <h2 className="font-display text-fl-xl font-semibold tracking-[-0.2px] text-ground">Keep or skip</h2>
          <p className="mx-auto mt-2 max-w-md text-fl-md font-medium leading-relaxed text-ground/80">
            One attendee at a time, with the evidence that ranked them. Keep sends them to your Inbox, where you pick the next move.
          </p>
        </Reveal>
        <Reveal delayMs={140} className="mx-auto mt-8 max-w-md rounded-card bg-surface p-5 text-left shadow-card">
          <div className="flex items-center gap-3">
            <Avatar name={attendeeName(ALEX)} src={MARKETING_AVATARS[ALEX.id]} size="md" />
            <div className="min-w-0">
              <p className="text-fl-base font-bold leading-tight text-ink">{attendeeName(ALEX)}</p>
              <p className="mt-0.5 truncate text-fl-sm font-medium text-ink2">{ALEX.role}</p>
            </div>
          </div>
          <blockquote className="mt-4 border-t border-rule pt-3 text-fl-sm leading-relaxed text-ink2">{ALEX_EVIDENCE}</blockquote>
          <div className="mt-4 flex justify-end">
            <DecisionChips />
          </div>
        </Reveal>
      </section>

      {/* 5. Closing CTA */}
      <section className="border-t border-rule bg-surface px-5 py-16 text-center lg:py-20">
        <Reveal>
          <h2 className="mx-auto max-w-md font-display text-fl-2xl font-semibold tracking-[-0.3px] text-ink text-balance">
            Try it before your next event.
          </h2>
          <div className="mt-6 flex justify-center">
            <DemoLink className="px-7" />
          </div>
        </Reveal>
      </section>
    </main>
  );
}
