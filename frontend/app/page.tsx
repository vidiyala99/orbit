import Link from "next/link";
import MarketingNav from "@/components/MarketingNav";
import DemoEnterButton from "@/components/DemoEnterButton";
import FadeInStagger from "@/components/FadeInStagger";

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
              Bring people together around what&apos;s happening nearby.
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-sm font-medium leading-relaxed text-ink2 sm:max-w-lg sm:text-base lg:mt-6 lg:max-w-2xl lg:text-xl">
              Pick a vibe, see who&apos;s around, and walk over. No signup wall.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 lg:mt-10">
              <DemoEnterButton label="Try it out" next="/explore" />
            </div>
          </FadeInStagger>
        </section>

        <section className="bg-surface px-6 py-14 lg:py-24">
          <h2 className="text-center text-lg font-extrabold tracking-[-0.3px] text-ink lg:text-3xl">
            Four taps
          </h2>
          <div className="mx-auto mt-7 flex max-w-sm flex-col gap-5 lg:mt-12 lg:max-w-2xl lg:gap-8">
            {[
              { n: 1, t: "Try it out", d: "Jump in. Demo login happens behind the button." },
              { n: 2, t: "Pick a category", d: "Tech, Design, Food, Music, Sports, Outdoors." },
              { n: 3, t: "See what's nearby", d: "A shortlist on the map — plans and rooms for that vibe." },
              { n: 4, t: "Find people or start a room", d: "Say hi in Event Room, or post your own plan." },
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
            Ready when you are
          </h2>
          <div className="mt-5 flex flex-col items-center gap-3 lg:mt-8">
            <DemoEnterButton
              label="Try it out"
              next="/explore"
              className="lift btn-press rounded-full bg-ground px-7 py-3 text-sm font-bold text-ink shadow-raised hover:shadow-raised-hover disabled:opacity-50 lg:text-lg"
            />
            <Link href="/sign-in" className="text-[12px] font-medium text-tab-idle underline decoration-white/20">
              I already have an account
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
