import MarketingNav from "@/components/MarketingNav";

export default function AboutPage() {
  return (
    <>
      <MarketingNav active="about" />
      <main className="min-h-screen bg-ground">
        <section className="mx-auto flex max-w-4xl flex-col items-center gap-10 px-6 py-14 md:flex-row md:items-start lg:gap-16 lg:px-10 lg:py-24">
          <div className="max-w-lg lg:max-w-xl">
            <h1 className="text-2xl font-extrabold tracking-[-0.4px] text-ink lg:text-5xl">
              Why Orbit exists
            </h1>
            <p className="mt-4 text-sm font-medium leading-relaxed text-ink2 lg:mt-8 lg:text-xl lg:leading-relaxed">
              Cold applications rarely get a response. Cold email is unreliable. LinkedIn
              connection requests often don&apos;t turn into a real conversation. Meeting someone
              in person works better than any of those, but it takes time to find the right
              people to meet, and most people don&apos;t have that time.
            </p>
            <p className="mt-4 text-sm font-medium leading-relaxed text-ink2 lg:mt-6 lg:text-xl lg:leading-relaxed">
              Orbit is built to reduce that time cost. Post where you&apos;ll be, and the
              people worth meeting can find you before you arrive.
            </p>
          </div>

          {/* Two cards, same object as the rest of the product — one faded (the
              channel that doesn't work), one live (the one that does), telling
              the thesis visually instead of just in prose. */}
          <div className="flex flex-shrink-0 flex-col gap-3 pt-2 lg:gap-4">
            <div className="w-48 rounded-card bg-surface/70 p-4 opacity-70 shadow-card lg:w-56">
              <p className="text-xs font-bold text-ink3 lg:text-sm">LinkedIn request</p>
              <p className="mt-1 font-mono text-[9.5px] text-ink3 lg:text-xs">left on read · 14d ago</p>
            </div>
            <div className="lift w-48 rounded-card bg-surface p-4 shadow-card hover:shadow-card-hover lg:w-56">
              <p className="text-xs font-bold text-ink lg:text-sm">Priya S.</p>
              <p className="mt-1 text-[10.5px] font-medium text-ink2 lg:text-xs">Coffee · Palo Alto</p>
              <p className="mt-2.5 flex items-center gap-1.5 text-[9.5px] font-bold text-accent lg:text-xs">
                <span className="live-dot" aria-hidden="true" />
                Live till 4P
              </p>
            </div>
          </div>
        </section>

        <section className="bg-ink px-6 py-16 text-center lg:py-24">
          <p className="mx-auto max-w-md text-lg font-semibold leading-relaxed text-ground lg:max-w-3xl lg:text-3xl lg:leading-relaxed">
            &ldquo;Networking runs on luck — who you happen to sit next to, who&apos;s still around
            when the doors open. This is the app for when none of that is luck anymore.&rdquo;
          </p>
          <p className="mt-4 text-[10.5px] font-bold uppercase tracking-[0.04em] text-tab-idle lg:mt-6 lg:text-sm">
            — The founding idea
          </p>
        </section>
      </main>
    </>
  );
}
