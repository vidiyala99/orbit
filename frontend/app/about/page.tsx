import MarketingNav from "@/components/MarketingNav";

export default function AboutPage() {
  return (
    <>
      <MarketingNav active="about" />
      <main className="min-h-screen bg-[#F6F3EC] px-6 py-14">
        <div className="mx-auto max-w-lg">
          <h1 className="font-display text-2xl font-bold text-ink">
            A cover letter used to cost something.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-[#4A4438]">
            AI erased that cost — now every inbox is flooded with volume that proves nothing
            about the person behind it.{" "}
            <strong className="text-accent">
              The one signal AI still can&apos;t fake is two people who&apos;ve actually stood in
              the same room.
            </strong>
          </p>
          <p className="mt-4 text-sm leading-relaxed text-[#4A4438]">
            That&apos;s not a nice-to-have anymore. It&apos;s the scarce channel, precisely because
            everything else got cheap. StayConnected exists to make that channel less
            accidental — say where you&apos;ll be, get spotted by the people worth meeting,
            leave with something that survives past a LinkedIn add that quietly stops replying.
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-lg border-t border-dashed border-rule pt-8 text-center">
          <p className="font-hand text-xl text-ink">
            &quot;Networking runs on luck — who you happen to sit next to, who&apos;s still around
            when the doors open. This is the app for when none of that is luck anymore.&quot;
          </p>
          <p className="mt-2 font-mono text-[10px] text-ink2">— THE FOUNDING IDEA</p>
        </div>
      </main>
    </>
  );
}
