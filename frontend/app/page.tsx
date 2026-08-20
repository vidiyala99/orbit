import Link from "next/link";
import MarketingNav from "@/components/MarketingNav";
import WaitlistForm from "@/components/WaitlistForm";
import FadeInStagger from "@/components/FadeInStagger";

export default async function Page() {
  return (
    <>
      <MarketingNav active="home" />
      <main className="min-h-screen bg-[#F6F3EC]">
        <section className="px-6 py-16 text-center lg:py-28">
          <FadeInStagger>
            <h1 className="mx-auto max-w-md font-display text-3xl font-bold text-ink sm:max-w-xl sm:text-5xl lg:max-w-3xl lg:text-6xl">
              Networking used to run on luck.{" "}
              <span className="text-accent">Now it doesn&apos;t.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-sm text-ink2 sm:max-w-lg sm:text-base lg:max-w-2xl lg:mt-6 lg:text-xl">
              The one channel AI can&apos;t fake: say where you&apos;ll be, get spotted by the
              people worth meeting, leave with a connection that outlasts a LinkedIn add.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row lg:mt-10 lg:gap-4">
              <WaitlistForm />
              <Link
                href="/how-it-works"
                className="btn-press whitespace-nowrap rounded-full border border-rule px-4 py-2 font-display text-sm font-semibold text-ink lg:px-7 lg:py-3.5 lg:text-lg"
              >
                See how it works
              </Link>
            </div>
            <div className="mt-10 flex justify-center gap-3 lg:mt-16 lg:gap-6">
              <div className="w-28 rotate-[-2deg] rounded-card bg-card p-2 shadow-[2px_5px_10px_rgba(0,0,0,0.14)] transition-transform hover:rotate-0 hover:shadow-[3px_8px_16px_rgba(0,0,0,0.2)] lg:w-44 lg:p-4">
                <p className="font-display text-[10px] font-bold text-ink lg:text-base">Priya S.</p>
                <p className="text-[9px] text-ink2 lg:mt-1 lg:text-sm">Coffee · Palo Alto</p>
              </div>
              <div className="mt-2 w-28 rotate-[1.5deg] rounded-card bg-card p-2 shadow-[2px_5px_10px_rgba(0,0,0,0.14)] transition-transform hover:rotate-0 hover:shadow-[3px_8px_16px_rgba(0,0,0,0.2)] lg:mt-4 lg:w-44 lg:p-4">
                <p className="font-display text-[10px] font-bold text-ink lg:text-base">Dev K.</p>
                <p className="text-[9px] text-ink2 lg:mt-1 lg:text-sm">→ Sunnyvale</p>
              </div>
              <div className="w-28 rotate-[-1deg] rounded-card bg-card p-2 shadow-[2px_5px_10px_rgba(0,0,0,0.14)] transition-transform hover:rotate-0 hover:shadow-[3px_8px_16px_rgba(0,0,0,0.2)] lg:w-44 lg:p-4">
                <p className="font-display text-[10px] font-bold text-ink lg:text-base">Marcus T.</p>
                <p className="text-[9px] text-ink2 lg:mt-1 lg:text-sm">met · yesterday</p>
              </div>
            </div>
          </FadeInStagger>
        </section>

        <section className="bg-card px-6 py-14 lg:py-24">
          <h2 className="text-center font-display text-lg font-bold text-ink lg:text-3xl">
            Three steps, no luck required
          </h2>
          <p className="mx-auto mt-1 max-w-xs text-center text-xs text-ink2 lg:max-w-md lg:mt-2 lg:text-base">
            From posting a plan to leaving with a real connection
          </p>
          <div className="mx-auto mt-6 flex max-w-sm flex-col gap-4 lg:mt-12 lg:max-w-2xl lg:gap-8">
            {[
              { n: 1, t: "Post where you'll be", d: "A coffee chat, a meetup, a ride share — free text, snapped to neighborhood precision" },
              { n: 2, t: "Get spotted before you arrive", d: "Anyone nearby with a live plan shows up on the board — map or list" },
              { n: 3, t: "Leave with a stamp, not just an add", d: "Both sides confirm \"we met\" in chat — timestamped, undeletable proof" },
            ].map((step) => (
              <div key={step.n} className="flex gap-3 lg:gap-5">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-accent font-mono text-xs font-bold text-accent lg:h-10 lg:w-10 lg:text-lg">
                  {step.n}
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-ink lg:text-xl">{step.t}</p>
                  <p className="text-xs text-ink2 lg:mt-1 lg:text-base">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-board px-6 py-14 text-center [background-image:radial-gradient(rgba(0,0,0,.12)_1px,transparent_1px)] [background-size:7px_7px] lg:py-24">
          <p className="mx-auto max-w-sm font-hand text-xl text-card lg:max-w-3xl lg:text-4xl">
            Cold applications rarely get a response. Cold email is unreliable. LinkedIn
            connection requests often don&apos;t turn into a real conversation. Meeting someone in
            person still works, but most people don&apos;t have time to go find the right people
            to meet.
          </p>
          <p className="mt-2 font-mono text-[10px] text-rule lg:mt-4 lg:text-sm">
            — THE THESIS,{" "}
            <Link href="/about" className="underline">
              SEE ABOUT US
            </Link>
          </p>
        </section>

        <section className="bg-ink px-6 py-14 text-center lg:py-24">
          <h2 className="font-display text-lg font-bold text-card lg:text-3xl">Stop leaving it to luck</h2>
          <p className="mt-1 text-xs text-[#B8AF9E] lg:mt-2 lg:text-base">Free, public, any city</p>
          <div className="mt-4 flex justify-center lg:mt-8">
            <WaitlistForm />
          </div>
        </section>
      </main>
    </>
  );
}
