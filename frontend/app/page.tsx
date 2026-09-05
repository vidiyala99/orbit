import MarketingNav from "@/components/MarketingNav";
import DemoEnterButton from "@/components/DemoEnterButton";
import LandingPreview from "@/components/LandingPreview";

const STEPS = [
  { n: "1", title: "Pick a location", body: "A city, or the pin you’re standing on." },
  { n: "2", title: "Pick a theme", body: "Tech, Design, Food, Music, Sports, Outdoors." },
  { n: "3", title: "See the map", body: "Pins for people, events, and rooms nearby." },
];

export default function Page() {
  return (
    <>
      <MarketingNav active="home" />
      <main className="min-h-screen bg-ground">
        <section className="mx-auto flex max-w-lg flex-col px-5 pb-8 pt-10 sm:max-w-2xl sm:px-8 lg:max-w-6xl lg:flex-row lg:items-center lg:gap-16 lg:px-10 lg:py-20">
          <div className="lg:max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent">
              Orbit
            </p>
            <h1 className="mt-3 text-[32px] font-extrabold leading-[1.12] tracking-[-0.6px] text-ink sm:text-5xl lg:text-[56px]">
              Meet the people already at your café, hackathon, or event.
            </h1>
            <p className="mt-4 text-[15px] font-medium leading-relaxed text-ink2 sm:text-lg">
              You see who’s nearby and what they’re doing. They see you.
              Then you walk over — not send a cold DM.
            </p>
            <p className="mt-3 text-[13px] font-semibold text-ink3">
              For people at cafés, hackathons, and events who want a real meetup.
            </p>
            <div className="mt-8 max-w-sm">
              <DemoEnterButton label="Try it out" next="/try" />
            </div>
          </div>
          <div className="mt-10 lg:mt-0 lg:flex-1">
            <LandingPreview />
          </div>
        </section>

        <section className="border-t border-rule bg-surface px-5 py-12 sm:px-8 lg:py-16">
          <h2 className="text-center text-xl font-extrabold tracking-[-0.3px] text-ink sm:text-2xl">
            How it works
          </h2>
          <ol className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="rounded-card bg-ground p-5 shadow-card">
                <p className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-sm font-extrabold text-accent">
                  {step.n}
                </p>
                <p className="mt-4 text-[15px] font-bold text-ink">{step.title}</p>
                <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-ink2">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </>
  );
}
