import Link from "next/link";
import MarketingNav from "@/components/MarketingNav";
import BrandMark from "@/components/BrandMark";
import Reveal from "@/components/Reveal";
import WaitlistForm from "@/components/WaitlistForm";
import MarketingFocusPreview from "@/components/MarketingFocusPreview";
import MarketingRoomRail from "@/components/MarketingRoomRail";
import { APP_HOME } from "@/lib/routes";

const H1 = "Know who to meet before you walk in.";
const SUB =
  "Actintro ranks real event guests against your Focus, helps you Keep who matters, and gets you ready to act from Inbox. Starts with Luma; built for any room with a guest list.";

const STEPS = [
  {
    n: "01",
    title: "Pull the guest list",
    body: "Connect Luma today for events you are attending. Roles and public profiles land with each name. More platforms can follow the same path.",
  },
  {
    n: "02",
    title: "Set Focus",
    body: "Say what you do and what you need. Ranking and why-meet run against that, not a generic score.",
  },
  {
    n: "03",
    title: "Keep or skip",
    body: "One person at a time on Home. Keep stashes them in Inbox with note and DM drafts ready.",
  },
];

const INBOX_ROWS = [
  {
    name: "Alex Chen",
    why: "Agent infra overlap. Draft the hallway ask before doors open.",
    src: "https://i.pravatar.cc/80?img=12",
  },
  {
    name: "Priya Raman",
    why: "Hiring an ML engineer. You just shipped a ranking stack.",
    src: "https://i.pravatar.cc/80?img=47",
  },
];

export default function Page() {
  return (
    <main className="h-full min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain bg-ground text-ink">
      <MarketingNav />

      {/* 1. Asymmetric hero */}
      <section className="relative overflow-hidden border-b border-rule">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)] lg:gap-14 lg:px-8 lg:pt-16">
          <div className="max-w-[34rem]">
            <p
              style={{ animation: "riseIn 500ms cubic-bezier(0.16,1,0.3,1) both" }}
              className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-accent"
            >
              For the hour before the room
            </p>
            <h1
              style={{ animation: "riseIn 550ms cubic-bezier(0.16,1,0.3,1) 40ms both" }}
              className="mt-3 font-display text-fl-hero font-bold tracking-[-0.6px] text-balance"
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
              className="mt-7 flex flex-col gap-3"
            >
              <WaitlistForm />
              <p className="text-fl-sm font-medium text-ink3">
                Already exploring?{" "}
                <Link href={APP_HOME} className="font-semibold text-accent hover:underline">
                  Try the demo
                </Link>
              </p>
            </div>
          </div>

          <div style={{ animation: "riseIn 650ms cubic-bezier(0.16,1,0.3,1) 160ms both" }}>
            <MarketingFocusPreview />
          </div>
        </div>
      </section>

      {/* 2. Full-bleed editorial problem */}
      <section className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://picsum.photos/seed/lobby-glass/1800/1000"
          alt=""
          aria-hidden="true"
          className="kenburns h-[420px] w-full object-cover grayscale lg:h-[520px]"
        />
        <div className="absolute inset-0 bg-ink/72" aria-hidden="true" />
        <div className="absolute inset-0 flex items-center">
          <Reveal as="div" className="mx-auto max-w-3xl px-6">
            <p className="text-center font-display text-fl-2xl font-medium leading-snug text-ground text-balance">
              Two hundred names on a guest list will not tell you which fifteen are worth your evening.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 3. Numbered horizontal steps */}
      <section className="border-t border-rule bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
          <Reveal>
            <h2 className="max-w-xl font-display text-fl-2xl font-bold tracking-[-0.03em] text-ink text-balance">
              Guest list in. Focus on. Inbox when it matters.
            </h2>
            <p className="mt-3 max-w-lg text-fl-md font-medium text-ink2">
              Three moves. No CRM theater. Luma first; the same loop for any event list we wire next.
            </p>
          </Reveal>
          <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
            {STEPS.map((step, i) => (
              <Reveal key={step.n} delayMs={80 * i} as="li" className="relative border-t border-rule pt-5">
                <p className="font-mono text-fl-sm font-bold tabular-nums text-accent">{step.n}</p>
                <h3 className="mt-3 font-display text-fl-lg font-bold tracking-[-0.02em] text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-fl-base font-medium leading-relaxed text-ink2">{step.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* 4. Split: Focus truth (text left, live stage right) */}
      <section className="border-t border-rule bg-ground">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
          <Reveal>
            <p className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink3">
              Home
            </p>
            <h2 className="mt-3 font-display text-fl-2xl font-bold tracking-[-0.03em] text-ink text-balance">
              Ranked for your Focus. Decide on the stage.
            </h2>
            <p className="mt-4 max-w-md text-fl-md font-medium leading-relaxed text-ink2">
              Photo, signals, how to approach, Skip and Keep. The marketing preview is the same
              instrument you open after demo login, not a fake list of cards.
            </p>
            <ul className="mt-6 space-y-3 text-fl-base font-medium text-ink2">
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                Hybrid ranking with a plain-language why meet
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                Coral Keep is the only loud control
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                Filmstrip queue so the next face is one tap away
              </li>
            </ul>
          </Reveal>
          <Reveal delayMs={120} className="rounded-hero border border-rule bg-surface p-5 shadow-card lg:p-6">
            <p className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink3">
              Your Focus
            </p>
            <p className="mt-2 font-display text-fl-lg font-bold tracking-[-0.02em] text-ink">
              Builder, agent eval tooling
            </p>
            <p className="mt-1 text-fl-base font-medium text-ink2">
              Finding design partners who run evals in production.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <div className="rounded-card bg-ground/80 px-3 py-3">
                <p className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-ink3">
                  Role
                </p>
                <p className="mt-1 text-fl-sm font-bold text-ink">Builder, agent eval tooling</p>
              </div>
              <div className="rounded-card bg-ground/80 px-3 py-3">
                <p className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-ink3">
                  Struggle
                </p>
                <p className="mt-1 text-fl-sm font-bold text-ink">Design partners in production</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 5. Ink spotlight: Keep sends to Inbox */}
      <section className="border-t border-rule bg-ink px-5 py-16 text-ground lg:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-fl-2xl font-bold tracking-[-0.03em] text-balance">
              Keep or skip. Inbox holds the ones that matter.
            </h2>
            <p className="mt-4 max-w-xl text-fl-md font-medium leading-relaxed text-ground/75">
              Skip clears the stage. Keep files the person with context so note and DM drafts are
              ready when you introduce yourself.
            </p>
          </Reveal>
          <Reveal delayMs={140} className="mt-10 grid gap-4 md:grid-cols-2">
            {INBOX_ROWS.map((row) => (
              <article
                key={row.name}
                className="flex gap-4 rounded-hero border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={row.src}
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 shrink-0 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <p className="font-display text-fl-lg font-bold tracking-[-0.02em]">{row.name}</p>
                  <p className="mt-1 text-fl-sm font-medium leading-snug text-ground/70">{row.why}</p>
                </div>
              </article>
            ))}
          </Reveal>
        </div>
      </section>

      {/* 6. Filmstrip rail */}
      <section className="border-t border-rule bg-surface-raised pt-14 lg:pt-16">
        <Reveal>
          <MarketingRoomRail />
        </Reveal>
      </section>

      {/* 7. Pull quote / proof line */}
      <section className="border-t border-rule bg-ground">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[1fr_1.2fr] lg:items-end lg:px-8 lg:py-20">
          <Reveal>
            <BrandMark size={48} className="text-accent" />
            <p className="mt-6 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink3">
              Built for builders
            </p>
          </Reveal>
          <Reveal delayMs={100}>
            <blockquote className="font-display text-fl-2xl font-medium leading-snug tracking-[-0.02em] text-ink text-balance">
              Match under time pressure. Act on the intro. Leave the spreadsheet in the rideshare.
            </blockquote>
          </Reveal>
        </div>
      </section>

      {/* 8. Closing waitlist */}
      <section className="border-t border-rule bg-surface px-5 py-16 lg:py-20">
        <Reveal className="mx-auto max-w-lg text-center">
          <h2 className="font-display text-fl-2xl font-bold tracking-[-0.03em] text-ink text-balance">
            Get in before the next lobby fills.
          </h2>
          <p className="mt-3 text-fl-base font-medium text-ink2">
            Join the waitlist. We will email when Actintro opens wider seats.
          </p>
          <div className="mx-auto mt-7 flex justify-center">
            <WaitlistForm />
          </div>
          <p className="mt-4 text-fl-sm font-medium text-ink3">
            <Link href={APP_HOME} className="font-semibold text-accent hover:underline">
              Try the demo
            </Link>
          </p>
        </Reveal>
      </section>

      {/* 9. Footer */}
      <footer className="border-t border-rule bg-ground px-5 py-8 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-1.5 font-display text-fl-base font-bold text-ink">
            <BrandMark size={16} className="text-accent" />
            Actintro
          </Link>
          <p className="text-fl-sm font-medium text-ink3">
            Personal matchmaking for event nights.{" "}
            <a href="mailto:hello@actintro.com" className="text-ink2 hover:text-accent">
              hello@actintro.com
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}
