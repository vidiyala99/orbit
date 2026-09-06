import Link from "next/link";
import { APP_HOME } from "@/lib/routes";

const H1 = "You shouldn't have to babysit follow-ups.";
const SUB = "Personal communications manager - memory that closes the loop.";
const DESK_CAPTION = "Your desk - not another draft box.";

const PROOFS = [
  {
    id: "remember",
    icon: "bookmark" as const,
    text: "Remembers where you met + why it matters.",
  },
  {
    id: "queue",
    icon: "list" as const,
    text: "Queues who Needs you first.",
  },
  {
    id: "prepare",
    icon: "pencil" as const,
    text: "Prepares Copy note / Copy DM you approve.",
  },
];

const DESK_ROWS = [
  { name: "Maya Chen", met: "Met at Design League · Apr 12", face: "maya" as const },
  { name: "Arjun Patel", met: "Met at Systems Dinner · May 3", face: "arjun" as const },
  { name: "Elise Moreau", met: "Met at Research Forum · May 19", face: "elise" as const },
];

function PlanetRing({ className }: { className?: string }) {
  return (
    <svg
      data-testid="orbit-planet"
      width="22"
      height="22"
      viewBox="0 0 22 22"
      aria-hidden="true"
      className={className}
    >
      <circle cx="11" cy="11" r="5.1" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <ellipse
        cx="11"
        cy="11"
        rx="9.1"
        ry="3.05"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        transform="rotate(-28 11 11)"
      />
    </svg>
  );
}

function ProofIcon({ kind }: { kind: "bookmark" | "list" | "pencil" }) {
  if (kind === "bookmark") {
    return (
      <svg data-testid="proof-bookmark" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M4.2 2.6h7.6v10.6L8 11.05 4.2 13.2V2.6Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "list") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M6.2 4.2h6.2M6.2 8h6.2M6.2 11.8h6.2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        <circle cx="3.6" cy="4.2" r="0.85" fill="currentColor" />
        <circle cx="3.6" cy="8" r="0.85" fill="currentColor" />
        <circle cx="3.6" cy="11.8" r="0.85" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M10.05 2.7 13.3 5.95 6.2 13.05H2.95v-3.25L10.05 2.7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path d="M8.85 3.9 12.1 7.15" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3.2 12.8h3.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function LineArtFace({ who }: { who: "maya" | "arjun" | "elise" }) {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true" className="shrink-0">
      <circle cx="22" cy="22" r="21" fill="#F7F4EE" stroke="currentColor" strokeWidth="1.15" />
      {who === "maya" ? (
        <>
          <path
            d="M11.5 28.5c1.2-7.2 5.2-11 10.5-11s9.3 3.8 10.5 11"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.15"
          />
          <path
            d="M12.2 20.2c.4-7.6 4.2-12.4 9.8-12.4 5.4 0 9.2 4.6 9.8 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.15"
          />
          <path d="M17.6 21.1c.7.6 1.6.6 2.3 0M24.1 21.1c.7.6 1.6.6 2.3 0" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
          <path d="M20.4 25.4c.9.7 2.3.7 3.2 0" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </>
      ) : null}
      {who === "arjun" ? (
        <>
          <path
            d="M12.4 29c1-7.4 4.8-10.6 9.6-10.6S30.6 21.6 31.6 29"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.15"
          />
          <path
            d="M13 19.8c.6-6.6 3.8-10.4 9-10.4s8.4 3.8 9 10.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.15"
          />
          <path d="M16.2 28.2c1.8 2.4 9.8 2.4 11.6 0" fill="none" stroke="currentColor" strokeWidth="1.1" />
          <path d="M17.8 21.2c.6.5 1.5.5 2.1 0M24.1 21.2c.6.5 1.5.5 2.1 0" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
          <path d="M20.6 25.1c.8.55 2 .55 2.8 0" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </>
      ) : null}
      {who === "elise" ? (
        <>
          <path
            d="M11.2 29.2c1.4-7.6 5.4-11.4 10.8-11.4s9.4 3.8 10.8 11.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.15"
          />
          <path
            d="M10.8 24c.2-9.2 4.6-15.2 11.2-15.2S32.8 14.8 33.2 24c-1.6 1.6-3.8 2.4-6.2 2.2-1.8 3.6-9.8 3.8-12.4.2-2.2.4-3.4-.4-3.8-2.4Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.15"
            strokeLinejoin="round"
          />
          <path d="M17.7 21.3c.7.55 1.6.55 2.3 0M24 21.3c.7.55 1.6.55 2.3 0" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
          <path d="M20.3 25.5c1 .75 2.4.75 3.4 0" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </>
      ) : null}
    </svg>
  );
}

export default function Page() {
  return (
    <main className="landing-paper min-h-dvh text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 text-ink">
          <span className="font-serif text-[26px] leading-none tracking-[-0.3px]">Orbit</span>
          <PlanetRing />
        </Link>
        <nav className="flex items-center gap-2.5 sm:gap-3" aria-label="Landing">
          <Link
            href={APP_HOME}
            className="btn-press inline-flex min-h-11 items-center justify-center border border-ink bg-transparent px-3.5 text-[13px] font-medium text-ink sm:px-4"
          >
            Open app
          </Link>
          <Link
            href={APP_HOME}
            className="btn-press inline-flex min-h-11 items-center justify-center bg-lake px-4 text-[13px] font-semibold text-white sm:px-5"
          >
            Try it
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-6 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:pb-24 lg:pt-10">
        <div>
          <h1 className="max-w-[16ch] font-serif text-[40px] font-semibold leading-[1.12] tracking-[-0.4px] text-ink sm:text-[48px] lg:text-[52px]">
            {H1}
          </h1>
          <div className="mt-6 h-px w-16 bg-ink/40" aria-hidden="true" />
          <p className="mt-5 max-w-md font-mono text-[13px] leading-relaxed text-ink2 sm:text-[14px]">
            {SUB}
          </p>
          <ul className="mt-10">
            {PROOFS.map((proof, i) => (
              <li
                key={proof.id}
                className={`flex items-center gap-3.5 py-3.5 ${
                  i > 0 ? "border-t border-dotted border-ink/25" : ""
                }`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/70 text-ink">
                  <ProofIcon kind={proof.icon} />
                </span>
                <p className="font-serif text-[16px] leading-snug text-ink sm:text-[17px]">{proof.text}</p>
              </li>
            ))}
          </ul>
        </div>

        <figure data-testid="needs-you-desk" className="min-w-0">
          <div className="rounded-[22px] bg-lake-muted px-4 py-5 shadow-[0_8px_24px_rgba(47,51,44,0.08)] sm:px-6 sm:py-6">
            <div className="flex items-end justify-between gap-3 pb-3">
              <h2 className="font-serif text-[22px] font-semibold leading-none tracking-[-0.2px]">
                Needs you
              </h2>
              <p className="font-mono text-[11px] leading-none text-ink2 sm:text-[12px]">
                3 people - sorted by priority
              </p>
            </div>
            <div className="h-px bg-ink/20" aria-hidden="true" />
            <ul>
              {DESK_ROWS.map((row, i) => (
                <li
                  key={row.name}
                  className={`flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
                    i > 0 ? "border-t border-ink/15" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <LineArtFace who={row.face} />
                    <div className="min-w-0">
                      <p className="font-serif text-[17px] leading-tight">{row.name}</p>
                      <p className="mt-1 truncate font-mono text-[11px] leading-snug text-ink2 sm:text-[12px]">
                        {row.met}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 pl-14 sm:pl-0">
                    <span className="inline-flex min-h-9 items-center justify-center bg-lake px-3 text-[12px] font-semibold text-white">
                      Copy note
                    </span>
                    <span className="inline-flex min-h-9 items-center justify-center border border-ink bg-white px-3 text-[12px] font-medium text-ink">
                      Copy DM
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <figcaption className="mt-4 text-center font-mono text-[12px] text-ink2 sm:text-[13px]">
            {DESK_CAPTION}
          </figcaption>
        </figure>
      </section>
    </main>
  );
}
