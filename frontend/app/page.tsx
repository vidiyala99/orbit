import Link from "next/link";
import MarketingNav from "@/components/MarketingNav";
import WaitlistForm from "@/components/WaitlistForm";
import FadeInStagger from "@/components/FadeInStagger";

export default async function Page() {
  return (
    <>
      <MarketingNav active="home" />
      <main className="min-h-screen bg-[#F6F3EC]">
        <section className="px-6 py-16 text-center">
          <FadeInStagger>
            <h1 className="mx-auto max-w-md font-display text-3xl font-bold text-ink">
              Networking used to run on luck.{" "}
              <span className="text-accent">Now it doesn&apos;t.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-sm text-ink2">
              The one channel AI can&apos;t fake: say where you&apos;ll be, get spotted by the
              people worth meeting, leave with a connection that outlasts a LinkedIn add.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <WaitlistForm />
              <Link
                href="/how-it-works"
                className="btn-press whitespace-nowrap rounded-full border border-rule px-4 py-2 font-display text-sm font-semibold text-ink"
              >
                See how it works
              </Link>
            </div>
            <div className="mt-10 flex justify-center gap-3">
              <div className="w-28 rotate-[-2deg] rounded-card bg-card p-2 shadow-[2px_5px_10px_rgba(0,0,0,0.14)] transition-transform hover:rotate-0 hover:shadow-[3px_8px_16px_rgba(0,0,0,0.2)]">
                <p className="font-display text-[10px] font-bold text-ink">Priya S.</p>
                <p className="text-[9px] text-ink2">Coffee · Palo Alto</p>
              </div>
              <div className="mt-2 w-28 rotate-[1.5deg] rounded-card bg-card p-2 shadow-[2px_5px_10px_rgba(0,0,0,0.14)] transition-transform hover:rotate-0 hover:shadow-[3px_8px_16px_rgba(0,0,0,0.2)]">
                <p className="font-display text-[10px] font-bold text-ink">Dev K.</p>
                <p className="text-[9px] text-ink2">→ Sunnyvale</p>
              </div>
              <div className="w-28 rotate-[-1deg] rounded-card bg-card p-2 shadow-[2px_5px_10px_rgba(0,0,0,0.14)] transition-transform hover:rotate-0 hover:shadow-[3px_8px_16px_rgba(0,0,0,0.2)]">
                <p className="font-display text-[10px] font-bold text-ink">Marcus T.</p>
                <p className="text-[9px] text-ink2">met · yesterday</p>
              </div>
            </div>
          </FadeInStagger>
        </section>

        <section className="bg-card px-6 py-14">
          <h2 className="text-center font-display text-lg font-bold text-ink">
            Three steps, no luck required
          </h2>
          <p className="mx-auto mt-1 max-w-xs text-center text-xs text-ink2">
            From posting a plan to leaving with a real connection
          </p>
          <div className="mx-auto mt-6 flex max-w-sm flex-col gap-4">
            {[
              { n: 1, t: "Post where you'll be", d: "A coffee chat, a meetup, a ride share — free text, snapped to neighborhood precision" },
              { n: 2, t: "Get spotted before you arrive", d: "Anyone nearby with a live plan shows up on the board — map or list" },
              { n: 3, t: "Leave with a stamp, not just an add", d: "Both sides confirm \"we met\" in chat — timestamped, undeletable proof" },
            ].map((step) => (
              <div key={step.n} className="flex gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-accent font-mono text-xs font-bold text-accent">
                  {step.n}
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-ink">{step.t}</p>
                  <p className="text-xs text-ink2">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-board px-6 py-14 text-center [background-image:radial-gradient(rgba(0,0,0,.12)_1px,transparent_1px)] [background-size:7px_7px]">
          <p className="mx-auto max-w-sm font-hand text-xl text-card">
            &quot;Every recruiter&apos;s inbox is flooded with AI cover letters. The one signal that
            still can&apos;t be faked is two people who&apos;ve actually stood in the same room.&quot;
          </p>
          <p className="mt-2 font-mono text-[10px] text-rule">
            — THE THESIS,{" "}
            <Link href="/about" className="underline">
              SEE ABOUT US
            </Link>
          </p>
        </section>

        <section className="bg-ink px-6 py-14 text-center">
          <h2 className="font-display text-lg font-bold text-card">Stop leaving it to luck</h2>
          <p className="mt-1 text-xs text-[#B8AF9E]">Free, public, any city</p>
          <div className="mt-4 flex justify-center">
            <WaitlistForm />
          </div>
        </section>
      </main>
    </>
  );
}
