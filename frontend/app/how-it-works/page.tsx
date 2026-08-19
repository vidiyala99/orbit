import MarketingNav from "@/components/MarketingNav";
import WaitlistForm from "@/components/WaitlistForm";

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
              <div className="flex h-32 w-24 flex-shrink-0 items-center justify-center rounded-2xl bg-board [background-image:radial-gradient(rgba(0,0,0,.12)_1px,transparent_1px)] [background-size:5px_5px] lg:h-48 lg:w-36">
                {step.n === 3 ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-stamp bg-stamp/10 px-2 py-1 font-mono text-[8px] text-stamp lg:px-3 lg:py-1.5 lg:text-xs"
                    style={{ animation: "stampPress 600ms ease-out", transform: "rotate(-3deg)" }}
                  >
                    ● MET IN PERSON
                  </span>
                ) : (
                  <div className="w-16 rotate-[-1.5deg] rounded-card bg-card p-1.5 shadow-[1px_3px_6px_rgba(0,0,0,0.28)] lg:w-24 lg:p-2.5">
                    <p className="font-display text-[9px] font-bold text-ink lg:text-sm">Priya S.</p>
                  </div>
                )}
              </div>
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
