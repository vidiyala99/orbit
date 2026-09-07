"use client";
import MarketingNav from "@/components/MarketingNav";
import WaitlistForm from "@/components/WaitlistForm";
import ReplayOnView from "@/components/ReplayOnView";
import Reveal from "@/components/Reveal";
import Typewriter from "@/components/Typewriter";
import { FIXTURE_ATTENDEES, attendeeName } from "@/lib/demoFixtures";
import { compose_note_payload } from "@/lib/contactCopy";

const DESK_PEOPLE = FIXTURE_ATTENDEES.slice(0, 3);
const NOTE_ROW = FIXTURE_ATTENDEES.find((row) => row.id === "priya-raman") ?? FIXTURE_ATTENDEES[2];
const NOTE_TEXT = compose_note_payload(NOTE_ROW);

/** Display-only headshots, same fixed ids/photos as the home page desk widget. */
const MARKETING_AVATARS: Record<string, string> = {
  "alex-chen": "https://i.pravatar.cc/64?img=12",
  "marcus-ellis": "https://i.pravatar.cc/64?img=33",
  "priya-raman": "https://i.pravatar.cc/64?img=47",
};

const STEPS = [
  {
    n: 1,
    title: "Connect the guest list",
    desc: "Point Orbit at your Luma, Meetup, or Eventbrite invite, or let it find the RSVP in your Gmail.",
  },
  {
    n: 2,
    title: "It ranks who needs you first",
    desc: "Needs you, High, Later - the triage your calendar never gives you.",
  },
  {
    n: 3,
    title: "Copy the note it already wrote",
    desc: "Where you met, what you talked about, why it matters - ready to paste before you forget.",
  },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

export default function HowItWorksPage() {
  return (
    <>
      <MarketingNav active="how-it-works" />
      <main className="min-h-screen bg-ground">
        <div className="grain-overlay" aria-hidden="true" />
        <section className="px-6 py-12 text-center lg:py-20">
          <h1
            style={{ animation: "riseIn 550ms cubic-bezier(0.16,1,0.3,1) 40ms both" }}
            className="mx-auto max-w-sm text-fl-hero font-extrabold leading-tight tracking-[-0.4px] text-ink sm:max-w-xl lg:max-w-2xl"
          >
            Three moments, not a whole new inbox to manage
          </h1>
        </section>

        {STEPS.map((step, i) => (
          <div
            key={step.n}
            className={`border-t border-rule ${i % 2 === 1 ? "bg-ground" : "bg-surface"}`}
          >
            <div
              className={`mx-auto flex max-w-4xl flex-col items-center gap-5 px-6 py-8 md:flex-row lg:gap-14 lg:px-10 lg:py-16 ${
                i % 2 === 1 ? "md:flex-row-reverse" : ""
              }`}
            >
              {/* Fixed-size shell renders immediately (no layout shift); only the
                  content inside is deferred until scrolled into view, so CSS
                  animation-delay timers start when a reader actually sees them
                  instead of the instant the page mounts. */}
              <div className="flex min-h-[190px] w-full max-w-[280px] flex-shrink-0 flex-col items-center justify-center gap-2 rounded-[18px] bg-ink p-5 lg:min-h-[230px] lg:max-w-[340px] lg:gap-3 lg:p-8">
                <ReplayOnView>
                  {() => (
                    <>
                      {step.n === 1 && (
                        <div className="flex w-full flex-col gap-2">
                          {DESK_PEOPLE.map((row, idx) => (
                            <div
                              key={row.id}
                              className="flex items-center gap-2 rounded-card bg-surface px-2.5 py-2 shadow-card"
                              style={{ animation: `riseIn 350ms ease-out ${idx * 140}ms both` }}
                            >
                              {MARKETING_AVATARS[row.id] ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={MARKETING_AVATARS[row.id]}
                                  alt=""
                                  width={24}
                                  height={24}
                                  className="h-6 w-6 shrink-0 rounded-full object-cover"
                                />
                              ) : (
                                <span
                                  aria-hidden="true"
                                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[8px] font-bold text-accent"
                                >
                                  {initials(attendeeName(row))}
                                </span>
                              )}
                              <p className="truncate text-[9px] font-bold text-ink lg:text-xs">
                                {attendeeName(row)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                      {step.n === 2 && (
                        <div
                          role="tablist"
                          aria-label="Priority"
                          className="grid w-full grid-cols-3 overflow-hidden rounded-[10px] border border-rule bg-surface"
                          style={{ animation: "riseIn 350ms ease-out both" }}
                        >
                          <span
                            role="tab"
                            aria-selected="true"
                            className="flex h-8 items-center justify-center gap-1 bg-accent-soft text-[8px] font-bold text-ink lg:text-[11px]"
                          >
                            Needs you
                            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-accent" />
                          </span>
                          <span role="tab" aria-selected="false" className="flex h-8 items-center justify-center text-[8px] font-medium text-ink3 lg:text-[11px]">
                            High
                          </span>
                          <span role="tab" aria-selected="false" className="flex h-8 items-center justify-center text-[8px] font-medium text-ink3 lg:text-[11px]">
                            Later
                          </span>
                        </div>
                      )}
                      {step.n === 3 && (
                        <>
                          <div
                            className="w-full rounded-card bg-surface p-3 shadow-card lg:p-4"
                            style={{ animation: "riseIn 350ms ease-out both" }}
                          >
                            <p className="text-[10px] font-bold text-ink lg:text-base">
                              {attendeeName(NOTE_ROW)}
                            </p>
                            <p className="mt-1 min-h-[3.6em] text-[9px] leading-snug text-ink2 lg:text-sm">
                              <Typewriter text={NOTE_TEXT} speedMs={16} />
                            </p>
                          </div>
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[8.5px] font-bold text-white opacity-0 lg:text-xs"
                            style={{ animation: "stampPress 400ms ease-out 2600ms forwards" }}
                          >
                            Copied
                          </span>
                        </>
                      )}
                    </>
                  )}
                </ReplayOnView>
              </div>
              <Reveal className="max-w-xs text-center md:text-left lg:max-w-md">
                <p className="text-fl-sm font-bold uppercase tracking-[0.04em] text-accent">Step {step.n}</p>
                <p className="mt-1 text-fl-xl font-extrabold tracking-[-0.2px] text-ink">{step.title}</p>
                <p className="mt-1.5 text-fl-md font-medium leading-relaxed text-ink2 lg:mt-2">{step.desc}</p>
              </Reveal>
            </div>
          </div>
        ))}

        <section className="bg-ink px-6 py-14 text-center lg:py-24">
          <Reveal>
            <h2 className="text-fl-2xl font-extrabold tracking-[-0.3px] text-ground">Try it at your next event</h2>
            <div className="mt-4 flex justify-center lg:mt-8">
              <WaitlistForm />
            </div>
          </Reveal>
        </section>
      </main>
    </>
  );
}
