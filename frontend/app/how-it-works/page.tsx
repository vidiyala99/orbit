import MarketingNav from "@/components/MarketingNav";
import WaitlistForm from "@/components/WaitlistForm";
import ReplayOnView from "@/components/ReplayOnView";
import Typewriter from "@/components/Typewriter";

const PLAN_TEXT = "Grabbing coffee near University Ave, happy to talk shop.";

const STEPS = [
  {
    n: 1, title: "Post where you'll be",
    desc: "Type it like a text to a friend. Optional quick-tag chips (Need a ride, Coffee chat) get you started faster. Pinned to the board instantly, live for as long as you set.",
  },
  {
    n: 2, title: "Get spotted before you arrive",
    desc: "Anyone nearby sees your card on the board — list or map. Public replies let a whole group self-organize under one post, not three separate DMs you have to broker.",
  },
  {
    n: 3, title: "Leave with a stamp, not just an add",
    desc: "Either side taps \"we met\" once you actually connect. Timestamped, mutual, undeletable — the one piece of proof this wasn't another cold LinkedIn request.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <MarketingNav active="how-it-works" />
      <main className="min-h-screen bg-[#F6F3EC]">
        <section className="px-6 py-12 text-center lg:py-20">
          <h1 className="mx-auto max-w-sm font-display text-2xl font-bold text-ink sm:max-w-xl sm:text-4xl lg:max-w-2xl lg:text-5xl">
            Three moments, not a whole new app to learn
          </h1>
        </section>

        {STEPS.map((step, i) => (
          <div
            key={step.n}
            className={`border-t border-dashed border-rule ${i % 2 === 1 ? "bg-[#F6F3EC]" : "bg-card"}`}
          >
            <div
              className={`mx-auto flex max-w-4xl flex-col items-center gap-5 px-6 py-8 md:flex-row lg:gap-14 lg:px-10 lg:py-16 ${
                i % 2 === 1 ? "md:flex-row-reverse" : ""
              }`}
            >
              <ReplayOnView>
                <div className="flex w-full max-w-[280px] flex-shrink-0 flex-col items-center gap-2 rounded-2xl bg-board p-5 [background-image:radial-gradient(rgba(0,0,0,.12)_1px,transparent_1px)] [background-size:5px_5px] lg:max-w-[340px] lg:gap-3 lg:p-8">
                  {step.n === 1 && (
                    <div
                      className="w-full rounded-card bg-card p-2.5 shadow-[1px_3px_6px_rgba(0,0,0,0.28)] lg:p-4"
                      style={{ "--pin-rotate": "-1.5deg", animation: "pinIn 350ms ease-out both" } as React.CSSProperties}
                    >
                      <p className="font-display text-[10px] font-bold text-ink lg:text-base">Priya S.</p>
                      <p className="mt-1 min-h-[2.4em] text-[9px] text-ink2 lg:text-sm">
                        <Typewriter text={PLAN_TEXT} speedMs={22} />
                      </p>
                      <p
                        className="mt-2 font-mono text-[8px] font-bold text-accent opacity-0 lg:text-xs"
                        style={{ animation: "bubbleIn 300ms ease-out 1600ms forwards" }}
                      >
                        ● LIVE till 4P
                      </p>
                    </div>
                  )}
                  {step.n === 2 && (
                    <>
                      <div
                        className="w-full rounded-card bg-card p-2 shadow-[1px_3px_6px_rgba(0,0,0,0.28)] lg:p-3"
                        style={{ "--pin-rotate": "-1deg", animation: "pinIn 350ms ease-out both" } as React.CSSProperties}
                      >
                        <p className="font-display text-[9px] font-bold text-ink lg:text-sm">Priya S.</p>
                        <p className="text-[8px] text-ink2 lg:text-xs">Coffee · Palo Alto</p>
                      </div>
                      <div
                        className="w-full rounded-lg bg-card/90 px-2 py-1.5 text-left opacity-0 lg:px-3 lg:py-2"
                        style={{ animation: "bubbleIn 300ms ease-out 600ms forwards" }}
                      >
                        <p className="font-mono text-[7px] text-ink2 lg:text-[10px]">
                          💬 &quot;same event — heading to Caltrain too, want to walk over?&quot;
                        </p>
                      </div>
                      <div
                        className="w-full rounded-lg bg-card/90 px-2 py-1.5 text-left opacity-0 lg:px-3 lg:py-2"
                        style={{ animation: "bubbleIn 300ms ease-out 1100ms forwards" }}
                      >
                        <p className="font-mono text-[7px] text-ink2 lg:text-[10px]">
                          💬 &quot;I have a car, can drop 2 people near the station&quot;
                        </p>
                      </div>
                    </>
                  )}
                  {step.n === 3 && (
                    <>
                      <div
                        className="w-full rounded-lg bg-[#EFE6CF] px-2.5 py-1.5 text-left opacity-0 lg:px-3.5 lg:py-2"
                        style={{ animation: "bubbleIn 300ms ease-out 200ms forwards" }}
                      >
                        <p className="text-[9px] text-ink lg:text-sm">so good meeting you today!</p>
                      </div>
                      <span
                        className="inline-flex items-center gap-1 rounded-full border border-stamp bg-stamp/10 px-2 py-1 font-mono text-[8px] text-stamp opacity-0 lg:px-3 lg:py-1.5 lg:text-xs"
                        style={{ animation: "stampPress 500ms ease-out 700ms forwards", transform: "rotate(-3deg)" }}
                      >
                        ● MET IN PERSON
                      </span>
                    </>
                  )}
                </div>
              </ReplayOnView>
              <div className="max-w-xs text-center md:text-left lg:max-w-md">
                <p className="font-mono text-[10px] font-bold text-accent lg:text-sm">STEP {step.n}</p>
                <p className="font-display text-sm font-bold text-ink lg:mt-1 lg:text-2xl">{step.title}</p>
                <p className="mt-1 text-xs text-ink2 lg:mt-2 lg:text-base">{step.desc}</p>
              </div>
            </div>
          </div>
        ))}

        <section className="bg-ink px-6 py-14 text-center lg:py-24">
          <h2 className="font-display text-lg font-bold text-card lg:text-3xl">Try it at your next coffee chat</h2>
          <div className="mt-4 flex justify-center lg:mt-8">
            <WaitlistForm />
          </div>
        </section>
      </main>
    </>
  );
}
