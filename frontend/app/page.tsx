import MarketingNav from "@/components/MarketingNav";
import DemoEnterButton from "@/components/DemoEnterButton";
import FadeInStagger from "@/components/FadeInStagger";
import LandingPreview from "@/components/LandingPreview";

const AUDIENCE = [
  {
    title: "At a café or cowork",
    body: "See who else is already here — then walk over instead of staring at a laptop.",
  },
  {
    title: "At a hackathon or meetup",
    body: "The room is on the map. Skip the cold intro and find your table.",
  },
  {
    title: "New in town",
    body: "Pick a theme. Meet people around it in person — not in another DM thread.",
  },
];

const STEPS = [
  { n: "1", title: "Pick a location", body: "A city, or the pin you’re standing on." },
  { n: "2", title: "Pick a theme", body: "Tech, Design, Food, Music, Sports, or Outdoors." },
  { n: "3", title: "Meet on the map", body: "Pins for events and people. Start a room." },
];

export default function Page() {
  return (
    <>
      <MarketingNav active="home" />
      <main className="min-h-screen bg-ground">
        <section className="mx-auto grid max-w-lg grid-cols-1 px-5 pb-10 pt-8 sm:max-w-2xl sm:px-8 lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-14 lg:px-10 lg:py-16">
          <FadeInStagger>
            <h1 className="text-[32px] font-extrabold leading-[1.12] tracking-[-0.6px] text-ink sm:text-5xl lg:text-[52px]">
              See who&apos;s nearby.{" "}
              <span className="text-accent">Meet them in person.</span>
            </h1>
            <p className="mt-4 max-w-md text-[15px] font-medium leading-relaxed text-ink2 sm:text-lg">
              Pick a place. Pick a theme. Orbit pins events and people around you —
              then you walk over.
            </p>
            <div className="mt-7 max-w-sm">
              <DemoEnterButton label="Try it out" next="/try" />
            </div>
          </FadeInStagger>
          <div className="mt-10 lg:mt-0">
            <LandingPreview />
          </div>
        </section>

        <section className="border-t border-rule bg-surface px-5 py-12 sm:px-8 lg:py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-xl font-extrabold tracking-[-0.3px] text-ink sm:text-2xl">
              Who it&apos;s for
            </h2>
            <ul className="mt-8 grid gap-3 sm:grid-cols-3">
              {AUDIENCE.map((item) => (
                <li key={item.title} className="rounded-card bg-ground p-5 shadow-card">
                  <p className="text-[15px] font-bold text-ink">{item.title}</p>
                  <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-ink2">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-xl font-extrabold tracking-[-0.3px] text-ink sm:text-2xl">
              How it works
            </h2>
            <ol className="mt-8 grid gap-3 sm:grid-cols-3">
              {STEPS.map((step) => (
                <li key={step.n} className="rounded-card bg-surface p-5 shadow-card">
                  <p className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-sm font-extrabold text-accent">
                    {step.n}
                  </p>
                  <p className="mt-4 text-[15px] font-bold text-ink">{step.title}</p>
                  <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-ink2">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
    </>
  );
}
