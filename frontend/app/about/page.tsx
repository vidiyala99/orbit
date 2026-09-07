import MarketingNav from "@/components/MarketingNav";
import Reveal from "@/components/Reveal";

export default function AboutPage() {
  return (
    <>
      <MarketingNav active="about" />
      <main className="min-h-screen bg-ground">
        <div className="grain-overlay" aria-hidden="true" />
        <section className="mx-auto flex max-w-4xl flex-col items-center gap-10 px-6 py-14 md:flex-row md:items-start lg:gap-16 lg:px-10 lg:py-24">
          <div
            style={{ animation: "riseIn 550ms cubic-bezier(0.16,1,0.3,1) 40ms both" }}
            className="max-w-lg lg:max-w-xl"
          >
            <h1 className="text-fl-2xl font-extrabold tracking-[-0.4px] text-ink">
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

          {/* Two cards, same object as the rest of the product - one faded (the
              channel that loses the detail), one live (the one that keeps it),
              telling the thesis visually instead of just in prose. */}
          <div
            style={{ animation: "riseIn 550ms cubic-bezier(0.16,1,0.3,1) 200ms both" }}
            className="flex flex-shrink-0 flex-col gap-3 pt-2 lg:gap-4"
          >
            <div className="w-48 rounded-card bg-surface/70 p-4 opacity-70 shadow-card lg:w-56">
              <p className="text-fl-sm font-bold text-ink3">Notes app</p>
              <p className="mt-1 font-mono text-fl-xs text-ink3">buried since Tuesday</p>
            </div>
            <div className="lift w-48 rounded-card bg-surface p-4 shadow-card hover:shadow-card-hover lg:w-56">
              <p className="text-fl-sm font-bold text-ink">Priya Raman</p>
              <p className="mt-1 text-fl-xs font-medium text-ink2">ML Engineer, Lattice</p>
              <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2 py-0.5 text-fl-xs font-bold uppercase tracking-[0.03em] text-accent">
                Needs you
              </p>
            </div>
          </div>
        </section>

        <section className="bg-ink px-6 py-16 text-center lg:py-24">
          <Reveal>
            <p className="mx-auto max-w-md text-fl-2xl font-semibold leading-relaxed text-ground lg:max-w-3xl">
              &ldquo;You already meet the right people. The event ends, the moment passes,
              and the follow-up dies in a notes app nobody reopens. This is the app that
              writes it down before you forget.&rdquo;
            </p>
            <p className="mt-4 text-fl-xs font-bold uppercase tracking-[0.04em] text-tab-idle lg:mt-6">
              - The founding idea
            </p>
          </Reveal>
        </section>
      </main>
    </>
  );
}
