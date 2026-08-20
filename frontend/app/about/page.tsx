import MarketingNav from "@/components/MarketingNav";

export default function AboutPage() {
  return (
    <>
      <MarketingNav active="about" />
      <main className="min-h-screen bg-[#F6F3EC]">
        <section className="mx-auto flex max-w-4xl flex-col items-center gap-10 px-6 py-14 md:flex-row md:items-start lg:gap-16 lg:px-10 lg:py-24">
          <div className="max-w-lg lg:max-w-xl">
            <h1 className="font-display text-2xl font-bold text-ink lg:text-5xl">
              Why StayConnected exists
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-[#4A4438] lg:mt-8 lg:text-xl lg:leading-relaxed">
              Cold applications rarely get a response. Cold email is unreliable. LinkedIn
              connection requests often don&apos;t turn into a real conversation. Meeting someone
              in person works better than any of those, but it takes time to find the right
              people to meet, and most people don&apos;t have that time.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-[#4A4438] lg:mt-6 lg:text-xl lg:leading-relaxed">
              StayConnected is built to reduce that time cost. Post where you&apos;ll be, and the
              people worth meeting can find you before you arrive.
            </p>
          </div>

          {/* Two pinned cards, same motif as the rest of the site — one greyed
              out (the channel that doesn't work), one live (the one that
              does), telling the thesis visually instead of just in prose. */}
          <div className="flex flex-shrink-0 flex-col gap-4 pt-2 lg:gap-6">
            <div className="relative w-48 rotate-[1.5deg] rounded-card bg-card/60 p-3 opacity-70 shadow-[1px_3px_6px_rgba(0,0,0,0.14)] lg:w-56 lg:p-4">
              <span className="absolute -top-1.5 left-5 h-2.5 w-2.5 rounded-full bg-ink2" aria-hidden="true" />
              <p className="font-display text-xs font-bold text-ink2 lg:text-sm">LinkedIn request</p>
              <p className="mt-1 font-mono text-[9px] text-ink2 lg:text-xs">left on read · 14d ago</p>
            </div>
            <div className="relative w-48 rotate-[-2deg] rounded-card bg-card p-3 shadow-[2px_5px_10px_rgba(0,0,0,0.2)] lg:w-56 lg:p-4">
              <span className="absolute -top-1.5 left-5 h-2.5 w-2.5 rounded-full bg-accent" aria-hidden="true" />
              <p className="font-display text-xs font-bold text-ink lg:text-sm">Priya S.</p>
              <p className="mt-1 text-[10px] text-ink2 lg:text-xs">Coffee · Palo Alto</p>
              <p className="mt-2 font-mono text-[9px] font-bold text-accent lg:text-xs">● LIVE till 4P</p>
            </div>
          </div>
        </section>

        <section className="bg-board px-6 py-16 text-center [background-image:radial-gradient(rgba(0,0,0,.12)_1px,transparent_1px)] [background-size:7px_7px] lg:py-24">
          <div className="relative mx-auto max-w-md rotate-[-1deg] rounded-card bg-card px-6 py-8 shadow-[3px_6px_14px_rgba(0,0,0,0.32)] lg:max-w-2xl lg:px-12 lg:py-12">
            <span className="absolute -top-2 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-accent shadow-[0_2px_3px_rgba(0,0,0,.35)]" aria-hidden="true" />
            <p className="font-hand text-xl text-ink lg:text-3xl">
              &quot;Networking runs on luck — who you happen to sit next to, who&apos;s still around
              when the doors open. This is the app for when none of that is luck anymore.&quot;
            </p>
            <p className="mt-3 font-mono text-[10px] text-ink2 lg:mt-5 lg:text-sm">— THE FOUNDING IDEA</p>
          </div>
        </section>
      </main>
    </>
  );
}
