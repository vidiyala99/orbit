const PINS = [
  { left: "28%", top: "38%", kind: "person" as const, label: "Priya" },
  { left: "62%", top: "46%", kind: "event" as const, label: "Hack table" },
  { left: "44%", top: "68%", kind: "person" as const, label: "Marcus" },
];

const CARDS = [
  { name: "Priya R.", status: "Working in a café" },
  { name: "Marcus E.", status: "At a hackathon" },
  { name: "Jules O.", status: "Just exploring" },
];

export default function LandingPreview() {
  return (
    <div data-testid="landing-preview" className="mx-auto w-full max-w-xl">
      <div className="relative h-[240px] overflow-hidden rounded-card bg-surface shadow-card sm:h-[280px] lg:h-[320px]">
        <div
          aria-hidden="true"
          className="absolute inset-0 [background-image:repeating-linear-gradient(0deg,transparent,transparent_46px,rgba(124,139,110,0.16)_46px,rgba(124,139,110,0.16)_47px),repeating-linear-gradient(90deg,transparent,transparent_64px,rgba(124,139,110,0.16)_64px,rgba(124,139,110,0.16)_65px)]"
        />
        <div aria-hidden="true" className="absolute left-6 top-8 h-[52px] w-[86px] rounded-[6px] bg-ground" />
        <div aria-hidden="true" className="absolute left-[46%] top-[88px] h-[72px] w-[78px] rounded-[6px] bg-ground" />
        <div aria-hidden="true" className="absolute left-10 bottom-10 h-[58px] w-[96px] rounded-[6px] bg-ground" />

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
              className={`flex h-6 w-6 -rotate-45 items-center justify-center rounded-full rounded-bl-none text-[11px] shadow-card ring-2 ring-surface ${
                pin.kind === "event" ? "bg-ink text-ground" : "bg-accent text-white"
              }`}
            >
              <span className="rotate-45">{pin.kind === "event" ? "★" : "●"}</span>
            </span>
          </span>
        ))}

        <p className="absolute left-3 top-3 rounded-full bg-ground/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-accent">
          Live nearby
        </p>
      </div>

      <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {CARDS.map((card) => (
          <li
            key={card.name}
            className="min-w-[140px] flex-1 rounded-card bg-surface px-3 py-2.5 text-left shadow-card"
          >
            <p className="text-[13px] font-bold text-ink">{card.name}</p>
            <p className="mt-1 inline-flex rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent">
              {card.status}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
