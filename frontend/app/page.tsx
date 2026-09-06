import Link from "next/link";
import { APP_HOME } from "@/lib/routes";

const H1 = "You shouldn’t have to babysit follow-ups.";
const SUB =
  "Personal communications manager — memory that closes the loop. Not a draft box.";

const AVATARS = [
  { initials: "SL", bg: "bg-accent", fg: "text-white" },
  { initials: "AC", bg: "bg-ink", fg: "text-ground" },
  { initials: "ME", bg: "bg-ink3", fg: "text-ground" },
  { initials: "PR", bg: "bg-accent-soft", fg: "text-accent" },
];

function OrbitMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="shrink-0">
      <circle cx="11" cy="11" r="2.6" className="fill-accent" />
      <path
        d="M11 2.6a8.4 8.4 0 1 1-7.3 4.2"
        fill="none"
        className="stroke-ink"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Page() {
  return (
    <main className="min-h-dvh bg-ground text-ink">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-[15px] font-extrabold tracking-[-0.2px]"
        >
          <OrbitMark />
          Orbit
        </Link>
        <Link
          href={APP_HOME}
          className="btn-press inline-flex min-h-11 items-center justify-center rounded-full border border-ink bg-transparent px-5 text-[13px] font-semibold text-ink"
        >
          Open app
        </Link>
      </header>

      <section className="mx-auto max-w-5xl px-6 pb-24 pt-10 sm:px-8 sm:pt-16">
        <h1 className="max-w-xl text-[34px] font-extrabold leading-[1.12] tracking-[-0.8px] sm:text-[44px]">
          {H1}
        </h1>
        <p className="mt-4 max-w-md text-[16px] font-medium leading-relaxed text-ink2 sm:text-[17px]">
          {SUB}
        </p>
        <Link
          href={APP_HOME}
          className="lift btn-press mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-7 py-3 text-[15px] font-bold text-white shadow-raised hover:bg-accent/90 hover:shadow-raised-hover"
        >
          Try it
        </Link>

        <figure className="mt-16 max-w-[420px]">
          <div
            data-testid="guest-proof"
            className="rounded-card bg-surface px-5 py-4 shadow-card"
          >
            <div className="flex items-center gap-4">
              <div className="flex shrink-0 -space-x-2" aria-hidden="true">
                {AVATARS.map((avatar) => (
                  <span
                    key={avatar.initials}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-surface ${avatar.bg} ${avatar.fg}`}
                  >
                    {avatar.initials}
                  </span>
                ))}
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-bold leading-tight">Sophie Lin</p>
                <p className="mt-1 text-[13px] font-medium text-ink2">Product at Linear</p>
              </div>
            </div>
            <p className="mt-3 font-mono text-[12px] leading-snug text-ink2">
              → Why meet: Event sync, intros, co-hosting
            </p>
          </div>
          <figcaption className="mt-4 text-center text-[13px] font-medium text-ink3">
            Looks like the guest list you already use.
          </figcaption>
        </figure>
      </section>
    </main>
  );
}
