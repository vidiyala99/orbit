/** Intentional no-photo stage — atmosphere + monogram, not a lonely letter on gray. */

export function PhotoFallback({
  initials,
  urgent = false,
}: {
  initials: string;
  urgent?: boolean;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a2230] via-[#2a3344] to-[#3d2a28]" />
      <div className="absolute -right-10 -top-14 h-48 w-48 rounded-full bg-accent/25 blur-3xl" />
      <div className="absolute -bottom-16 -left-10 h-52 w-52 rounded-full bg-black/35 blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)",
          backgroundSize: "14px 14px",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={[
            "flex aspect-square h-[min(42%,11rem)] min-h-[5.75rem] items-center justify-center rounded-full font-display font-bold tracking-[-0.04em] text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)]",
            urgent ? "bg-accent" : "bg-white/[0.14] ring-1 ring-white/25",
          ].join(" ")}
          style={{ fontSize: "clamp(1.75rem, 8vw, 3.25rem)" }}
        >
          {initials}
        </span>
      </div>
    </div>
  );
}
