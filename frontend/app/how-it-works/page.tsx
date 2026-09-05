"use client";
import MarketingNav from "@/components/MarketingNav";
import WaitlistForm from "@/components/WaitlistForm";
import ReplayOnView from "@/components/ReplayOnView";
import Typewriter from "@/components/Typewriter";

const PLAN_TEXT = "Grabbing coffee near University Ave, happy to talk shop.";

const STEPS = [
  {
    n: 1, title: "See the map",
    desc: "The first screen after Enter demo. Live plans and rooms around you, pinned to a place — no feed to hunt through.",
  },
  {
    n: 2, title: "Organize an event",
    desc: "Post a time-boxed plan at a cafe, cowork, or side event. One tap from the map. People nearby can message you before you arrive.",
  },
  {
    n: 3, title: "Research the room",
    desc: "Linkup deep research sits on the map and every plan — who typically attends, who's relevant, and how to open. Then leave with a stamp, not just an add.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <MarketingNav active="how-it-works" />
      <main className="min-h-screen bg-ground">
        <section className="px-6 py-12 text-center lg:py-20">
          <h1 className="mx-auto max-w-sm text-2xl font-extrabold leading-tight tracking-[-0.4px] text-ink sm:max-w-xl sm:text-4xl lg:max-w-2xl lg:text-5xl">
            Three moments, not a whole new app to learn
          </h1>
        </section>

        {STEPS.map((step, i) => (
          <div
            key={step.n}
            className={`border-t border-rule ${i % 2 === 1 ? "bg-ground" : "bg-surface"}`}
          >
            <div
              className={`mx-auto flex max-w-4xl flex-col items-center gap-5 px-6 py-8 md:flex-row lg:gap-14 lg:px-10 lg:py-16 ${
                i % 2 === 1 ? "md:flex-row-reverse" : ""
              }`}
            >
              {/* Fixed-size shell renders immediately (no layout shift); only the
                  content inside is deferred until scrolled into view, so CSS
                  animation-delay timers start when a reader actually sees them
                  instead of the instant the page mounts. */}
              <div className="flex min-h-[190px] w-full max-w-[280px] flex-shrink-0 flex-col items-center justify-center gap-2 rounded-[18px] bg-ink p-5 lg:min-h-[230px] lg:max-w-[340px] lg:gap-3 lg:p-8">
                <ReplayOnView>
                  {() => (
                    <>
                      {step.n === 1 && (
                        <div
                          className="w-full rounded-card bg-surface p-3 shadow-card lg:p-4"
                          style={{ animation: "riseIn 350ms ease-out both" }}
                        >
                          <p className="text-[10px] font-bold text-ink lg:text-base">Priya S.</p>
                          <p className="mt-1 min-h-[2.4em] text-[9px] text-ink2 lg:text-sm">
                            <Typewriter text={PLAN_TEXT} speedMs={22} />
                          </p>
                          <p
                            className="mt-2 flex items-center gap-1.5 text-[8.5px] font-bold text-accent opacity-0 lg:text-xs"
                            style={{ animation: "bubbleIn 300ms ease-out 1600ms forwards" }}
                          >
                            <span className="live-dot" aria-hidden="true" />
                            Live till 4P
                          </p>
                        </div>
                      )}
                      {step.n === 2 && (
                        <>
                          <div
                            className="w-full rounded-card bg-surface p-2.5 shadow-card lg:p-3"
                            style={{ animation: "riseIn 350ms ease-out both" }}
                          >
                            <p className="text-[9px] font-bold text-ink lg:text-sm">Priya S.</p>
                            <p className="mt-0.5 text-[8px] font-medium text-ink2 lg:text-xs">Coffee · Palo Alto</p>
                          </div>
                          <div
                            className="w-full rounded-[12px] rounded-bl-[4px] bg-surface px-2.5 py-1.5 text-left opacity-0 shadow-card lg:px-3 lg:py-2"
                            style={{ animation: "bubbleIn 300ms ease-out 600ms forwards" }}
                          >
                            <p className="text-[7.5px] font-medium text-ink2 lg:text-[11px]">
                              💬 &quot;same event — heading to Caltrain too, want to walk over?&quot;
                            </p>
                          </div>
                          <div
                            className="w-full rounded-[12px] rounded-bl-[4px] bg-surface px-2.5 py-1.5 text-left opacity-0 shadow-card lg:px-3 lg:py-2"
                            style={{ animation: "bubbleIn 300ms ease-out 1100ms forwards" }}
                          >
                            <p className="text-[7.5px] font-medium text-ink2 lg:text-[11px]">
                              💬 &quot;I have a car, can drop 2 people near the station&quot;
                            </p>
                          </div>
                        </>
                      )}
                      {step.n === 3 && (
                        <>
                          <div
                            className="w-full rounded-[12px] rounded-bl-[4px] bg-surface px-3 py-2 text-left opacity-0 shadow-card lg:px-3.5"
                            style={{ animation: "bubbleIn 300ms ease-out 200ms forwards" }}
                          >
                            <p className="text-[9px] font-medium text-ink lg:text-sm">so good meeting you today!</p>
                          </div>
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-[8.5px] font-bold uppercase tracking-[0.04em] text-accent opacity-0 lg:text-xs"
                            style={{ animation: "stampPress 500ms ease-out 700ms forwards" }}
                          >
                            ● Met in person
                          </span>
                        </>
                      )}
                    </>
                  )}
                </ReplayOnView>
              </div>
              <div className="max-w-xs text-center md:text-left lg:max-w-md">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.04em] text-accent lg:text-sm">Step {step.n}</p>
                <p className="mt-1 text-base font-extrabold tracking-[-0.2px] text-ink lg:text-2xl">{step.title}</p>
                <p className="mt-1.5 text-xs font-medium leading-relaxed text-ink2 lg:mt-2 lg:text-base">{step.desc}</p>
              </div>
            </div>
          </div>
        ))}

        <section className="bg-ink px-6 py-14 text-center lg:py-24">
          <h2 className="text-lg font-extrabold tracking-[-0.3px] text-ground lg:text-3xl">Try it at your next coffee chat</h2>
          <div className="mt-4 flex justify-center lg:mt-8">
            <WaitlistForm />
          </div>
        </section>
      </main>
    </>
  );
}
