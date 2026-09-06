import MarketingNav from "@/components/MarketingNav";
import DemoEnterButton from "@/components/DemoEnterButton";
import LandingPreview from "@/components/LandingPreview";
import { APP_HOME } from "@/lib/routes";

export default function Page() {
  return (
    <>
      <MarketingNav active="home" />
      <main className="min-h-screen bg-ground">
        <section className="mx-auto max-w-2xl px-6 py-8 sm:px-8 sm:py-10">
          <div className="overflow-hidden rounded-card bg-surface shadow-card">
            <LandingPreview />
            <div className="px-6 pb-8 pt-6 sm:px-8 sm:pb-10">
              <h1 className="text-[28px] font-extrabold leading-[1.15] tracking-[-0.4px] text-ink sm:text-[36px]">
                Meet the people already at your café or hackathon.
              </h1>
              <p className="mt-3 max-w-md text-[15px] font-medium leading-relaxed text-ink2 sm:text-base">
                Pick a place and a theme. See who&apos;s nearby — then walk over.
              </p>
              <div className="mt-6">
                <DemoEnterButton label="Try it out" next={APP_HOME} />
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
