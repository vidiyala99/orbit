import Link from "next/link";
import MarketingNav from "@/components/MarketingNav";
import Reveal from "@/components/Reveal";
import { APP_HOME } from "@/lib/routes";

const PRINCIPLES = [
  {
    title: "It remembers where you met",
    body: "The room, the event, the thread of conversation - the context that a business card or a LinkedIn add throws away.",
  },
  {
    title: "It knows what can wait",
    body: "Needs you, High, Later - so the four people who mattered don't get lost next to the dozen who don't.",
  },
  {
    title: "It writes the follow-up before the moment fades",
    body: "Not a reminder to write one yourself later, tired, when the details are already gone.",
  },
];

/** OrbitMark - the one recurring shape (ring + tilted orbit), used as a
 *  faint watermark behind the dark quote section, same treatment as the
 *  landing hero's "Needs you" panel. */
function OrbitMark({ className = "" }: { className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className={`shrink-0 ${className}`}>
      <circle cx="11" cy="11" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.35" />
      <ellipse cx="11" cy="11" rx="9.2" ry="3.35" fill="none" stroke="currentColor" strokeWidth="1.35" transform="rotate(-22 11 11)" />
    </svg>
  );
}

export default function AboutPage() {
  return (
    <>
      <MarketingNav active="about" />
      <main className="min-h-dvh bg-ground">
        <div className="grain-overlay" aria-hidden="true" />

        {/* 1. Hero - the thesis, plus a visual pair (fading channel vs. the
            one that keeps the detail) telling the same story without words. */}
        <section className="mx-auto flex max-w-4xl flex-col items-center gap-10 px-5 pb-14 pt-10 md:flex-row md:items-start lg:gap-16 lg:px-8 lg:pb-20 lg:pt-16">
          <div
            style={{ animation: "riseIn 550ms cubic-bezier(0.16,1,0.3,1) 40ms both" }}
            className="max-w-lg lg:max-w-xl"
          >
            <h1 className="font-display text-fl-2xl font-bold tracking-[-0.4px] text-ink text-balance">
              Why Orbit exists
            </h1>
            <p className="mt-4 text-fl-lg font-medium leading-relaxed text-ink2 lg:mt-8">
              The best conversations at an event disappear by the time you&apos;re on the
              train home. You meet a dozen people, promise to follow up with four of them,
              and by Monday you remember the vibe but not the details worth acting on.
            </p>
            <p className="mt-4 text-fl-lg font-medium leading-relaxed text-ink2 lg:mt-6">
              Orbit is the memory. It keeps where you met, what you talked about, and why
              it matters, then writes the note before the moment fades.
            </p>
          </div>

          <div
            style={{ animation: "riseIn 550ms cubic-bezier(0.16,1,0.3,1) 200ms both" }}
            className="flex w-full flex-shrink-0 flex-row gap-3 pt-1 md:w-auto md:flex-col lg:gap-4 lg:pt-2"
          >
            <div className="flex-1 rounded-card bg-surface/70 p-4 opacity-70 shadow-card md:w-56 md:flex-none">
              <p className="text-fl-sm font-bold text-ink3">Notes app</p>
              <p className="mt-1 font-mono text-fl-xs text-ink3">buried since Tuesday</p>
            </div>
            <div className="lift flex-1 rounded-card bg-surface p-4 shadow-card hover:shadow-card-hover md:w-56 md:flex-none">
              <p className="text-fl-sm font-bold text-ink">Priya Raman</p>
              <p className="mt-1 text-fl-xs font-medium text-ink2">ML Engineer, Lattice</p>
              <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2 py-0.5 text-fl-xs font-bold uppercase tracking-[0.03em] text-accent">
                Needs you
              </p>
            </div>
          </div>
        </section>

        {/* 2. Founding idea - large display italic on the one dark section,
            OrbitMark watermark ties it back to the product's recurring shape. */}
        <section className="relative overflow-hidden bg-ink px-6 py-16 text-center lg:py-24">
          <OrbitMark className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 text-ground/[0.06] lg:h-56 lg:w-56" />
          <Reveal className="relative">
            <p className="mx-auto max-w-md text-fl-2xl font-medium italic leading-snug text-ground lg:max-w-3xl">
              &ldquo;You already meet the right people. The event ends, the moment passes,
              and the follow-up dies in a notes app nobody reopens. This is the app that
              writes it down before you forget.&rdquo;
            </p>
            <p className="mt-5 text-fl-xs font-bold uppercase tracking-[0.08em] text-ground/60 lg:mt-6">
              - The founding idea
            </p>
          </Reveal>
        </section>

        {/* 3. What stays true - the thesis distilled to three principles,
            same list rhythm as the landing hero's proof row. */}
        <section className="border-t border-rule bg-surface px-5 py-14 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <h2 className="font-display text-fl-xl font-semibold tracking-[-0.2px] text-ink">
                What stays true, event after event
              </h2>
            </Reveal>
            <ul className="mt-6 flex flex-col">
              {PRINCIPLES.map((item, index) => (
                <Reveal
                  key={item.title}
                  as="li"
                  delayMs={index * 80}
                  className={`flex flex-col gap-1 py-5 sm:flex-row sm:items-baseline sm:gap-6 ${
                    index === 0 ? "border-t border-rule" : ""
                  } border-b border-rule`}
                >
                  <p className="font-mono text-fl-xs font-bold text-ink3 sm:w-6 sm:shrink-0">
                    0{index + 1}
                  </p>
                  <div>
                    <p className="text-fl-lg font-bold text-ink">{item.title}</p>
                    <p className="mt-1 text-fl-base font-medium leading-relaxed text-ink2">{item.body}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* 4. Closing CTA - matches the landing/how-it-works close. */}
        <section className="border-t border-rule bg-ground px-5 py-16 text-center lg:py-20">
          <Reveal>
            <h2 className="mx-auto max-w-md font-display text-fl-2xl font-semibold tracking-[-0.3px] text-ink text-balance">
              See it work at your next event.
            </h2>
            <div className="mt-6 flex justify-center">
              <Link
                href={APP_HOME}
                className="lift btn-press inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-7 text-fl-base font-bold text-white shadow-glow hover:bg-accent/90 hover:shadow-glow-hover"
              >
                Try it
              </Link>
            </div>
          </Reveal>
        </section>
      </main>
    </>
  );
}
