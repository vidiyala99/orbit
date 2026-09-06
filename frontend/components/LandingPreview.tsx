const PINS = [
  { left: "26%", top: "38%", kind: "person" as const, label: "Priya" },
  { left: "64%", top: "42%", kind: "event" as const, label: "Hack table" },
  { left: "44%", top: "68%", kind: "person" as const, label: "Marcus" },
  { left: "72%", top: "62%", kind: "event" as const, label: "Café cowork" },
];

const PIN_CLASS = {
  person: "bg-accent text-white",
  event: "bg-ink text-ground",
} as const;

const PIN_GLYPH = { person: "●", event: "★" } as const;

export default function LandingPreview() {
  return (
    <div data-testid="landing-preview" className="relative h-[280px] w-full overflow-hidden bg-ground sm:h-[340px]">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-80 [background-image:repeating-linear-gradient(0deg,transparent,transparent_46px,rgba(124,139,110,0.18)_46px,rgba(124,139,110,0.18)_47px),repeating-linear-gradient(90deg,transparent,transparent_64px,rgba(124,139,110,0.18)_64px,rgba(124,139,110,0.18)_65px)]"
      />
      <div aria-hidden="true" className="absolute left-6 top-10 h-[52px] w-[86px] rounded-[6px] bg-ground shadow-card" />
      <div aria-hidden="true" className="absolute left-[46%] top-[96px] h-[72px] w-[78px] rounded-[6px] bg-ground shadow-card" />
      <div aria-hidden="true" className="absolute left-10 bottom-12 h-[58px] w-[96px] rounded-[6px] bg-ground shadow-card" />

      <span
        data-testid="preview-you"
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 z-[1] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface ring-[3px] ring-accent"
      />

      {PINS.map((pin) => (
        <span
          key={pin.label}
          data-testid="preview-pin"
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
    </div>
  );
}
