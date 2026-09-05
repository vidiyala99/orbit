import Link from "next/link";
import MarketingNav from "@/components/MarketingNav";
import DemoEnterButton from "@/components/DemoEnterButton";
import FadeInStagger from "@/components/FadeInStagger";

const SAMPLE_CARDS = [
  { name: "Priya S.", meta: "Coffee · Palo Alto", live: true },
  { name: "Dev K.", meta: "→ Sunnyvale", live: false },
  { name: "Marcus T.", meta: "met · yesterday", live: false },
];

export default async function Page() {
  return (
    <>
      <MarketingNav active="home" />
      <main className="min-h-screen bg-ground">
        <section className="px-6 py-16 text-center lg:py-28">
          <FadeInStagger>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent lg:text-sm">
              Orbit
            </p>
            <h1 className="mx-auto mt-2 max-w-md text-3xl font-extrabold leading-[1.1] tracking-[-0.5px] text-ink sm:max-w-xl sm:text-5xl lg:max-w-3xl lg:text-6xl">
              See who&apos;s nearby.{" "}
              <span className="text-accent">Meet them in person.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-sm font-medium leading-relaxed text-ink2 sm:max-w-lg sm:text-base lg:mt-6 lg:max-w-2xl lg:text-xl">
              Map what&apos;s live around you, post a time-boxed plan, and research the
              room — no Google OAuth maze. One tap into the demo.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row lg:mt-10 lg:gap-4">
              <DemoEnterButton />
              <Link
                href="/sign-in"
                className="btn-press whitespace-nowrap rounded-full border border-rule bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:bg-accent-soft lg:px-7 lg:py-3.5 lg:text-lg"
              >
                Sign in
              </Link>
            </div>
            <div className="mt-10 flex justify-center gap-3 lg:mt-16 lg:gap-5">
              {SAMPLE_CARDS.map((c) => (
                <div
                  key={c.name}
                  className="lift w-28 rounded-card bg-surface p-3 text-left shadow-card hover:shadow-card-hover lg:w-44 lg:p-4"
                >
                  <p className="text-[11px] font-bold text-ink lg:text-base">{c.name}</p>
                  <p className="mt-0.5 text-[9px] font-medium text-ink2 lg:mt-1 lg:text-sm">
                    {c.meta}
                  </p>
                  {c.live && (
                    <p className="mt-2 flex items-center gap-1.5 text-[9px] font-bold text-accent lg:mt-3 lg:text-xs">
                      <span className="live-dot" aria-hidden="true" />
                      Live now
                    </p>
                  )}
                </div>
              ))}
            </div>
          </FadeInStagger>
        </section>

        <section className="bg-surface px-6 py-14 lg:py-24">
          <h2 className="text-center text-lg font-extrabold tracking-[-0.3px] text-ink lg:text-3xl">
            Three things, on the first screen
          </h2>
          <p className="mx-auto mt-1.5 max-w-xs text-center text-xs font-medium text-ink2 lg:mt-2.5 lg:max-w-md lg:text-base">
            Map, organize, research — then say hi
          </p>
          <div className="mx-auto mt-7 flex max-w-sm flex-col gap-5 lg:mt-12 lg:max-w-2xl lg:gap-8">
            {[
              { n: 1, t: "See the map", d: "The primary surface. Pins for live plans and rooms around you." },
              { n: 2, t: "Organize an event", d: "Post a time-boxed plan at a place — coffee, cowork, a side event." },
              { n: 3, t: "Research the room", d: "Linkup deep research on the event and who's relevant, visible on the map." },
            ].map((step) => (
              <div key={step.n} className="flex gap-3.5 lg:gap-5">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-extrabold text-accent lg:h-10 lg:w-10 lg:text-lg">
                  {step.n}
                </div>
                <div>
                  <p className="text-sm font-bold text-ink lg:text-xl">{step.t}</p>
                  <p className="mt-0.5 text-xs font-medium text-ink2 lg:mt-1 lg:text-base">
                    {step.d}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-ink px-6 py-14 text-center lg:py-24">
          <h2 className="text-lg font-extrabold tracking-[-0.3px] text-ground lg:text-3xl">
            Judges: skip the OAuth maze
          </h2>
          <p className="mt-1.5 text-xs font-medium text-tab-idle lg:mt-2.5 lg:text-base">
            Open Orbit → Enter demo → map
          </p>
          <div className="mt-5 flex justify-center lg:mt-8">
            <DemoEnterButton
              label="Enter demo"
              className="lift btn-press rounded-full bg-ground px-7 py-3 text-sm font-bold text-ink shadow-raised hover:shadow-raised-hover disabled:opacity-50 lg:text-lg"
            />
          </div>
        </section>
      </main>
    </>
  );
}
