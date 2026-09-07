import Link from "next/link";
import type { ReactNode } from "react";
import MarketingNav from "@/components/MarketingNav";
import Reveal from "@/components/Reveal";
import { APP_HOME } from "@/lib/routes";
import { FIXTURE_ATTENDEES, attendeeName } from "@/lib/demoFixtures";
import { compose_note_payload } from "@/lib/contactCopy";

const H1 = "You shouldn't have to babysit follow-ups.";
const SUB = "Personal communications manager - memory that closes the loop.";
const CAPTION = "Your desk - not another draft box.";

const PROOFS = [
  { icon: "bookmark" as const, text: "Remembers where you met + why it matters." },
  { icon: "list" as const, text: "Queues who needs you first." },
  { icon: "pencil" as const, text: "Prepares Copy note / Copy DM you approve." },
];

/** Display-only headshots for the marketing desk widget. Real fixture rows
 *  carry avatar_url: null (no product change) - this maps a few fixed ids to
 *  stable placeholder photos so the landing page shows faces, not initials. */
const MARKETING_AVATARS: Record<string, string> = {
  "alex-chen": "https://i.pravatar.cc/96?img=12",
  "marcus-ellis": "https://i.pravatar.cc/96?img=33",
  "priya-raman": "https://i.pravatar.cc/96?img=47",
};

const DESK_PEOPLE = FIXTURE_ATTENDEES.slice(0, 3).map((row) => ({
  id: row.id,
  name: attendeeName(row),
  met: row.note.where_met,
  avatar: MARKETING_AVATARS[row.id],
}));

const ALEX = FIXTURE_ATTENDEES.find((row) => row.id === "alex-chen") ?? FIXTURE_ATTENDEES[0];
const PRIYA = FIXTURE_ATTENDEES.find((row) => row.id === "priya-raman") ?? FIXTURE_ATTENDEES[2];
/** compose_note_payload's real clipboard output uses an em dash as its DM
 *  voice; the marketing page's copy-ban is stricter than the product's own
 *  string format, so this is a display-only substitution, not a product
 *  change - ContactNote still copies the unmodified payload. */
const NOTE_TEXT = compose_note_payload(PRIYA).replace(/—/g, "-");

const FEATURES = [
  {
    title: "Needs you, ranked",
    body: "Needs you, High, Later - sorted the moment the list loads, not after you dig through it.",
    tone: "accent" as const,
  },
  {
    title: "A note that already knows",
    body: "Where you met, what you talked about, why it matters - stacked into one paste.",
    tone: "surface" as const,
  },
  {
    title: "Evidence, not guesses",
    body: `"${ALEX.evidence[0]?.quote ?? "shipping a first-class agent runtime"}" - that's why ${ALEX.first_name} is on your list, not a hunch.`,
    tone: "ink" as const,
  },
  {
    title: "Same memory, shorter",
    body: "Copy DM trims the same fields to something you'd actually send from your phone.",
    tone: "surface" as const,
  },
];

const EVENTS = ["NERDCONF SF", "Burning Token hackathon", "Founders Cowork Wednesdays"];

const SOURCES = ["Luma", "Meetup", "Eventbrite", "Google Calendar", "Gmail invite"];

const FAQS = [
  {
    q: "Is this another CRM?",
    a: "No pipelines, no deal stages. Just the people from one event and what to say to them next.",
  },
  {
    q: "Do I have to build the guest list myself?",
    a: "No. Point Orbit at your Luma, Meetup, or Eventbrite invite, or let it spot the RSVP in your Gmail, and the list fills itself.",
  },
  {
    q: "Where does the data come from?",
    a: "Whatever's public about your event's guest list - profiles, posts, and the room you were actually in.",
  },
  {
    q: "What happens after the event?",
    a: "The desk stays until you've followed up on everyone. Then it's done, not a field you keep filling in.",
  },
];

function OrbitMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="shrink-0">
      <circle cx="11" cy="11" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.35" />
      <ellipse cx="11" cy="11" rx="9.2" ry="3.35" fill="none" stroke="currentColor" strokeWidth="1.35" transform="rotate(-22 11 11)" />
    </svg>
  );
}

function IconCircle({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <span
      data-testid={testId}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rule bg-surface text-accent"
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

function BookmarkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M5 2.4h6v11.2L8 11.2 5 13.6V2.4Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      <path d="M6.2 4.2h3.6" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
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
      <path d="M10.4 3.1 12.9 5.6 6 12.5H3.5V10l6.9-6.9Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      <path d="M9.1 4.4 11.6 6.9" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function ProofIcon({ name }: { name: (typeof PROOFS)[number]["icon"] }) {
  if (name === "bookmark") return <IconCircle testId="proof-icon-bookmark"><BookmarkIcon /></IconCircle>;
  if (name === "list") return <IconCircle><ListIcon /></IconCircle>;
  return <IconCircle><PencilIcon /></IconCircle>;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

function FeatureCard({ feature }: { feature: (typeof FEATURES)[number] }) {
  const look =
    feature.tone === "accent"
      ? "bg-accent text-white"
      : feature.tone === "ink"
        ? "bg-ink text-ground"
        : "bg-surface text-ink shadow-card";
  const body = feature.tone === "accent" ? "text-white/85" : feature.tone === "ink" ? "text-ground/80" : "text-ink2";
  return (
    <div className={`lift rounded-card p-6 ${look}`}>
      <p className="text-fl-lg font-extrabold tracking-[-0.2px]">{feature.title}</p>
      <p className={`mt-2 text-fl-base font-medium leading-relaxed ${body}`}>{feature.body}</p>
    </div>
  );
}

export default function Page() {
  return (
    <main className="min-h-dvh bg-ground text-ink">
      <div className="grain-overlay" aria-hidden="true" />
      <MarketingNav active="home" />

      {/* 1. Hero - asymmetric split */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.18fr)] lg:gap-14 lg:px-8 lg:pt-16">
        <div className="max-w-[540px]">
          <h1
            style={{ animation: "riseIn 550ms cubic-bezier(0.16,1,0.3,1) 40ms both" }}
            className="text-fl-hero font-extrabold tracking-[-0.4px]"
          >
            {H1}
          </h1>
          <p
            style={{ animation: "riseIn 550ms cubic-bezier(0.16,1,0.3,1) 140ms both" }}
            className="mt-4 text-fl-md font-medium leading-relaxed text-ink2"
          >
            {SUB}
          </p>
          <div
            style={{ animation: "riseIn 550ms cubic-bezier(0.16,1,0.3,1) 220ms both" }}
            className="mt-6 flex flex-wrap gap-3"
          >
            <Link
              href={APP_HOME}
              className="lift btn-press inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-6 text-fl-base font-bold text-white hover:bg-accent/90"
            >
              Try it
            </Link>
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
          <div data-testid="needs-you-desk" className="rounded-[18px] bg-accent-soft px-5 py-6 sm:px-7 sm:py-7">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-fl-md font-bold text-ink">Needs you</p>
              <p className="text-fl-xs font-medium text-ink2">{DESK_PEOPLE.length} people · sorted by priority</p>
            </div>
            <ul className="mt-4 flex flex-col gap-3">
              {DESK_PEOPLE.map((row) => (
                <li key={row.id} className="lift flex flex-wrap items-center gap-3 rounded-card bg-surface px-4 py-3.5 shadow-card sm:flex-nowrap">
                  {row.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.avatar}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-fl-sm font-bold text-accent">
                      {initials(row.name)}
                    </span>
                  )}
                  <div className="min-w-[11rem] flex-1">
                    <p className="text-fl-base font-bold leading-tight text-ink">{row.name}</p>
                    <p className="mt-0.5 text-fl-sm font-medium leading-snug text-ink2">{row.met}</p>
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-accent px-3 py-1.5 text-fl-xs font-bold text-white">Copy note</span>
                    <span className="inline-flex items-center rounded-full border border-rule bg-surface px-3 py-1.5 text-fl-xs font-bold text-ink">Copy DM</span>
                  </div>
                </li>
              ))}
            </ul>
            <figcaption className="mt-5 text-center text-fl-sm font-medium text-ink2">{CAPTION}</figcaption>
          </div>
        </figure>
      </section>

      {/* 2. Problem - full-bleed editorial statement over a real photo */}
      <section className="relative overflow-hidden border-t border-rule">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://picsum.photos/seed/streetlight-door/1600/900"
          alt="Someone turning away as a train pulls out of the station"
          className="kenburns h-[420px] w-full object-cover grayscale lg:h-[520px]"
        />
        <div className="absolute inset-0 bg-ink/70" aria-hidden="true" />
        <div className="absolute inset-0 flex items-center">
          <Reveal as="div" className="mx-auto max-w-2xl px-6">
            <p className="text-center font-serif text-fl-2xl italic leading-snug text-ground">
              The best conversations end at the door, and nobody writes them down.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 3. How it works, steps 1-2 - alternating split */}
      <div className="border-t border-rule bg-surface">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 py-14 md:flex-row lg:gap-16 lg:py-20">
          <Reveal className="w-full max-w-sm flex-shrink-0 rounded-card bg-ink p-5">
            <ul className="flex flex-col gap-2">
              {DESK_PEOPLE.map((row) => (
                <li key={row.id} className="flex items-center gap-2 rounded-card bg-surface px-2.5 py-2 shadow-card">
                  {row.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.avatar} alt="" width={24} height={24} className="h-6 w-6 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[9px] font-bold text-accent">
                      {initials(row.name)}
                    </span>
                  )}
                  <p className="truncate text-fl-xs font-bold text-ink">{row.name}</p>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delayMs={120} className="max-w-md">
            <p className="text-fl-xl font-extrabold tracking-[-0.2px] text-ink">Connect the guest list</p>
            <p className="mt-2 text-fl-md font-medium leading-relaxed text-ink2">
              Point Orbit at your Luma, Meetup, or Eventbrite invite, or let it find the RSVP in your Gmail, and it pulls in who's attending, plus what's public about them.
            </p>
          </Reveal>
        </div>
        <div className="mx-auto flex max-w-5xl flex-col-reverse items-center gap-8 border-t border-rule px-6 py-14 md:flex-row lg:gap-16 lg:py-20">
          <Reveal delayMs={120} className="max-w-md">
            <p className="text-fl-xl font-extrabold tracking-[-0.2px] text-ink">It ranks who needs you first</p>
            <p className="mt-2 text-fl-md font-medium leading-relaxed text-ink2">
              Needs you, High, Later - the triage your calendar never gives you.
            </p>
          </Reveal>
          <Reveal className="w-full max-w-sm flex-shrink-0 rounded-card bg-ink p-5">
            <div role="tablist" aria-label="Priority" className="grid w-full grid-cols-3 overflow-hidden rounded-[10px] border border-rule bg-surface">
              <span role="tab" aria-selected="true" className="flex h-9 items-center justify-center gap-1 bg-accent-soft text-fl-xs font-bold text-ink">
                Needs you
                <span aria-hidden="true" className="h-1 w-1 rounded-full bg-accent" />
              </span>
              <span role="tab" aria-selected="false" className="flex h-9 items-center justify-center text-fl-xs font-medium text-ink3">High</span>
              <span role="tab" aria-selected="false" className="flex h-9 items-center justify-center text-fl-xs font-medium text-ink3">Later</span>
            </div>
          </Reveal>
        </div>
      </div>

      {/* 4. How it works, step 3 - full-width feature spotlight (breaks the zigzag) */}
      <section className="border-t border-rule bg-ink px-6 py-16 text-center lg:py-24">
        <Reveal>
          <p className="text-fl-sm font-bold uppercase tracking-[0.04em] text-accent">Copy the note it already wrote</p>
          <p className="mx-auto mt-2 max-w-md text-fl-md font-medium leading-relaxed text-ground/80">
            Where you met, what you talked about, why it matters - ready to paste before you forget.
          </p>
        </Reveal>
        <Reveal delayMs={140} className="mx-auto mt-8 max-w-md rounded-card bg-surface p-5 text-left shadow-card">
          <p className="text-fl-base font-bold text-ink">{attendeeName(PRIYA)}</p>
          <p className="mt-2 min-h-[4.5em] text-fl-base leading-relaxed text-ink2">{NOTE_TEXT}</p>
          <span className="mt-3 inline-flex items-center rounded-full bg-accent px-3 py-1.5 text-fl-xs font-bold text-white">Copy note</span>
        </Reveal>
      </section>

      {/* 5. Feature bento grid */}
      <section className="border-t border-rule bg-ground px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2">
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.title} delayMs={index * 90}>
              <FeatureCard feature={feature} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* 6. Founding idea - quote block */}
      <section className="border-t border-rule bg-surface px-6 py-16 text-center lg:py-24">
        <Reveal>
          <p className="mx-auto max-w-3xl font-serif text-fl-2xl italic leading-relaxed text-ink">
            &ldquo;You already meet the right people. The event ends, the moment passes, and the
            follow-up dies in a notes app nobody reopens. This is the app that writes it down
            before you forget.&rdquo;
          </p>
          <p className="mt-4 text-fl-xs font-bold uppercase tracking-[0.04em] text-ink3">- The founding idea</p>
        </Reveal>
      </section>

      {/* 7. Where the list comes from - tag row (sources + real events, one family) */}
      <section className="border-t border-rule bg-ground px-6 py-12 text-center lg:py-16">
        <Reveal>
          <p className="text-fl-xl font-extrabold tracking-[-0.2px] text-ink">
            Synced from wherever you RSVP&apos;d
          </p>
        </Reveal>
        <div className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-3">
          {SOURCES.map((name, index) => (
            <Reveal key={name} as="span" delayMs={index * 60} className="rounded-full bg-accent-soft px-4 py-2 text-fl-sm font-bold text-ink">
              {name}
            </Reveal>
          ))}
        </div>
        <Reveal delayMs={SOURCES.length * 60}>
          <p className="mx-auto mt-6 max-w-md text-fl-sm font-medium text-ink3">
            Already built from real hallway tracks:
          </p>
        </Reveal>
        <div className="mx-auto mt-3 flex max-w-2xl flex-wrap justify-center gap-3">
          {EVENTS.map((name, index) => (
            <Reveal
              key={name}
              as="span"
              delayMs={SOURCES.length * 60 + 80 + index * 60}
              className="rounded-full border border-rule bg-surface px-4 py-2 text-fl-sm font-semibold text-ink"
            >
              {name}
            </Reveal>
          ))}
        </div>
      </section>

      {/* 8. FAQ */}
      <section className="border-t border-rule bg-surface px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <h2 className="text-fl-2xl font-extrabold tracking-[-0.3px] text-ink">Questions worth asking</h2>
          </Reveal>
          <dl className="mt-8 flex flex-col gap-6">
            {FAQS.map((item, index) => (
              <Reveal key={item.q} delayMs={index * 70} className="border-t border-rule pt-6 first:border-t-0 first:pt-0">
                <dt className="text-fl-lg font-extrabold text-ink">{item.q}</dt>
                <dd className="mt-2 text-fl-base font-medium leading-relaxed text-ink2">{item.a}</dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      {/* 9. Closing CTA */}
      <section className="border-t border-rule bg-ink px-5 py-16 text-center lg:py-20">
        <Reveal>
          <h2 className="mx-auto max-w-md text-fl-2xl font-extrabold tracking-[-0.3px] text-ground">
            Try it before your next event.
          </h2>
          <div className="mt-6 flex justify-center">
            <Link
              href={APP_HOME}
              className="lift btn-press inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-7 text-fl-base font-bold text-white hover:bg-accent/90"
            >
              Try it
            </Link>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
