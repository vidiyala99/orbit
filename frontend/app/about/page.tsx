import MarketingNav from "@/components/MarketingNav";

export default function AboutPage() {
  return (
    <>
      <MarketingNav active="about" />
      <main className="min-h-screen bg-[#F6F3EC] px-6 py-14 lg:py-24">
        <div className="mx-auto max-w-lg lg:max-w-3xl">
          <h1 className="font-display text-2xl font-bold text-ink lg:text-5xl">
            In-person is the only thing that still works.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-[#4A4438] lg:mt-8 lg:text-xl lg:leading-relaxed">
            Cold applications rarely get a response. Cold email is a coin flip. A LinkedIn add
            just as often gets left on read.{" "}
            <strong className="text-accent">
              The one thing that actually moves the needle is meeting someone in person.
            </strong>
          </p>
          <p className="mt-4 text-sm leading-relaxed text-[#4A4438] lg:mt-6 lg:text-xl lg:leading-relaxed">
            The problem was never effort — it&apos;s time. Nobody can network with everyone to
            find the right people. StayConnected exists to close that gap: say where you&apos;ll
            be, get spotted by the people worth meeting, before you even arrive.
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-lg border-t border-dashed border-rule pt-8 text-center lg:mt-20 lg:max-w-3xl lg:pt-14">
          <p className="font-hand text-xl text-ink lg:text-3xl">
            &quot;Networking runs on luck — who you happen to sit next to, who&apos;s still around
            when the doors open. This is the app for when none of that is luck anymore.&quot;
          </p>
          <p className="mt-2 font-mono text-[10px] text-ink2 lg:mt-4 lg:text-sm">— THE FOUNDING IDEA</p>
        </div>
      </main>
    </>
  );
}
