const PINS = [
  { left: "26%", top: "36%", kind: "person" as const, label: "Priya" },
  { left: "64%", top: "42%", kind: "event" as const, label: "Hack table" },
  { left: "48%", top: "70%", kind: "room" as const, label: "Founders" },
  { left: "38%", top: "54%", kind: "person" as const, label: "Marcus" },
];

const CARDS = [
  { name: "Priya R.", meta: "Working in a café", live: true },
  { name: "Hack table", meta: "Event · now" },
  { name: "Founders Cowork", meta: "Room · 3 here" },
];

const PIN_CLASS = {
  person: "bg-accent text-white",
  event: "bg-ink3 text-white",
  room: "bg-ink text-ground",
} as const;

const PIN_GLYPH = { person: "●", event: "★", room: "▦" } as const;

export default function LandingPreview() {
  return (
    <div data-testid="landing-preview" className="mx-auto w-full max-w-xl">
      <div className="relative h-[260px] overflow-hidden rounded-card bg-surface shadow-card sm:h-[300px] lg:h-[360px]">
        <div
          aria-hidden="true"
          className="absolute inset-0 [background-image:repeating-linear-gradient(0deg,transparent,transparent_46px,rgba(124,139,110,0.16)_46px,rgba(124,139,110,0.16)_47px),repeating-linear-gradient(90deg,transparent,transparent_64px,rgba(124,139,110,0.16)_64px,rgba(124,139,110,0.16)_65px)]"
        />
        <div aria-hidden="true" className="absolute left-6 top-8 h-[52px] w-[86px] rounded-[6px] bg-ground" />
        <div aria-hidden="true" className="absolute left-[46%] top-[88px] h-[72px] w-[78px] rounded-[6px] bg-ground" />
        <div aria-hidden="true" className="absolute left-10 bottom-10 h-[58px] w-[96px] rounded-[6px] bg-ground" />

        <p className="absolute left-3 top-3 z-10 rounded-full bg-ground/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-accent">
          Live nearby
        </p>

        <span
          data-testid="preview-you"
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 z-[1] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface ring-[3px] ring-accent"
        />

        {PINS.map((pin) => (
          <span
            key={pin.label}
            aria-hidden="true"
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{ left: pin.left, top: pin.top }}
          >
            <span
              className={`flex h-6 w-6 -rotate-45 items-center justify-center rounded-full rounded-bl-none text-[11px] shadow-card ring-2 ring-surface ${PIN_CLASS[pin.kind]}`}
            >
              <span className="rotate-45">{PIN_GLYPH[pin.kind]}</span>
            </span>
          </span>
        ))}

        <div className="absolute bottom-3 left-3 z-10 hidden w-[168px] rounded-card bg-surface p-3 shadow-raised sm:block">
          <p className="text-[13px] font-bold text-ink">Priya R.</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[10px] font-bold text-accent">
            <span className="live-dot" aria-hidden="true" />
            Working in a café
          </p>
        </div>
        <div className="absolute right-3 top-12 z-10 hidden w-[168px] rounded-card bg-surface p-3 shadow-raised sm:block">
          <p className="text-[13px] font-bold text-ink">Hack table</p>
          <p className="mt-1 font-mono text-[10px] text-ink3">Event · now</p>
        </div>
      </div>

      <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {CARDS.map((card) => (
          <li
            key={card.name}
            className="min-w-[140px] flex-1 rounded-card bg-surface px-3 py-2.5 text-left shadow-card"
          >
            <p className="text-[13px] font-bold text-ink">{card.name}</p>
            {card.live ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-[10px] font-bold text-accent">
                <span className="live-dot" aria-hidden="true" />
                {card.meta}
              </p>
            ) : (
              <p className="mt-1 inline-flex rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent">
                {card.meta}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
