import MarketingNav from "@/components/MarketingNav";
import DemoEnterButton from "@/components/DemoEnterButton";
import FadeInStagger from "@/components/FadeInStagger";

const STEPS = [
  { n: "1", title: "Pick a location", body: "A city, a neighborhood, or the pin you’re standing on." },
  { n: "2", title: "Pick a theme", body: "Tech, Design, Food, Music, Sports, or Outdoors." },
  { n: "3", title: "See events", body: "What’s happening near that place right now." },
  { n: "4", title: "Create a room", body: "Give the meetup a name so people can find you." },
  { n: "5", title: "See people nearby", body: "Names plus a status — café, hackathon, exploring." },
];

const AUDIENCE = [
  { title: "At an event", body: "Find the two people you actually want to meet before the room empties." },
  { title: "In a café", body: "See who’s already working nearby and open to a hello." },
  { title: "At a hackathon", body: "Skip the awkward cold DM. Walk over with a name and a status." },
];

const SAMPLE = [
  { name: "Priya R.", status: "Working in a café", live: true },
  { name: "Marcus E.", status: "At a hackathon", live: true },
  { name: "Jules O.", status: "Just exploring", live: false },
];

export default function Page() {
  return (
    <>
      <MarketingNav active="home" />
      <main className="min-h-screen bg-ground">
        <section className="px-6 py-14 text-center lg:py-24">
          <FadeInStagger>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent lg:text-sm">
              Orbit
            </p>
            <h1 className="mx-auto mt-2 max-w-lg text-3xl font-extrabold leading-[1.12] tracking-[-0.5px] text-ink sm:text-5xl lg:max-w-3xl lg:text-6xl">
              Meet people around what&apos;s happening near you.
            </h1>
            <p className="mx-auto mt-4 max-w-md text-sm font-medium leading-relaxed text-ink2 sm:text-base lg:mt-6 lg:max-w-xl lg:text-lg">
              Pick a place and a theme. See events, start a room, and meet the
              people already there — café, hackathon, or just exploring.
            </p>
            <div className="mt-8 flex justify-center lg:mt-10">
              <DemoEnterButton label="Try it out" next="/try" />
            </div>
            <div className="mt-10 flex justify-center gap-3 lg:mt-14 lg:gap-5">
              {SAMPLE.map((person) => (
                <div
                  key={person.name}
                  className="lift w-28 rounded-card bg-surface p-3 text-left shadow-card hover:shadow-card-hover lg:w-44 lg:p-4"
                >
                  <p className="text-[11px] font-bold text-ink lg:text-base">{person.name}</p>
                  <p className="mt-0.5 text-[9px] font-medium text-ink2 lg:mt-1 lg:text-sm">
                    {person.status}
                  </p>
                  {person.live && (
                    <p className="mt-2 flex items-center gap-1.5 text-[9px] font-bold text-accent lg:mt-3 lg:text-xs">
                      <span className="live-dot" aria-hidden="true" />
                      Here now
                    </p>
                  )}
                </div>
              ))}
            </div>
          </FadeInStagger>
        </section>

        <section className="bg-surface px-6 py-14 lg:py-24">
          <h2 className="text-center text-lg font-extrabold tracking-[-0.3px] text-ink lg:text-3xl">
            How it works
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-center text-xs font-medium text-ink2 lg:mt-2.5 lg:max-w-md lg:text-base">
            Five taps. Then you&apos;re looking at real people nearby.
          </p>
          <ol className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-2 lg:mt-12 lg:grid-cols-5 lg:gap-3">
            {STEPS.map((step) => (
              <li key={step.n} className="rounded-card bg-ground p-4 shadow-card lg:p-5">
                <p className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-xs font-extrabold text-accent">
                  {step.n}
                </p>
                <p className="mt-3 text-sm font-bold text-ink lg:text-base">{step.title}</p>
                <p className="mt-1 text-xs font-medium leading-relaxed text-ink2">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="px-6 py-14 lg:py-24">
          <h2 className="text-center text-lg font-extrabold tracking-[-0.3px] text-ink lg:text-3xl">
            Who it&apos;s for
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-center text-xs font-medium text-ink2 lg:mt-2.5 lg:text-base">
            People at events, cafés, and hackathons who want a real meetup.
          </p>
          <div className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-3 lg:mt-12">
            {AUDIENCE.map((item) => (
              <div key={item.title} className="rounded-card bg-surface p-5 shadow-card lg:p-6">
                <p className="text-sm font-extrabold text-ink lg:text-lg">{item.title}</p>
                <p className="mt-2 text-xs font-medium leading-relaxed text-ink2 lg:text-sm">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-ink px-6 py-14 text-center lg:py-24">
          <h2 className="text-lg font-extrabold tracking-[-0.3px] text-ground lg:text-3xl">
            See who&apos;s nearby
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-xs font-medium text-tab-idle lg:mt-3 lg:text-base">
            Try it out opens the demo. Location, theme, then the board.
          </p>
          <div className="mt-6 flex justify-center lg:mt-8">
            <DemoEnterButton
              label="Try it out"
              next="/try"
              className="lift btn-press rounded-full bg-ground px-7 py-3 text-sm font-bold text-ink shadow-raised hover:shadow-raised-hover disabled:opacity-50 lg:text-lg"
            />
          </div>
        </section>
      </main>
    </>
  );
}
