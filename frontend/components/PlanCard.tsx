import { PlanT } from "@/lib/types";

const ROTATIONS = ["-rotate-1", "rotate-1", "-rotate-[0.6deg]", "rotate-[1.4deg]"];

export default function PlanCard({ plan, rotationSeed }: { plan: PlanT; rotationSeed: number }) {
  const now = Date.now();
  const isLive = new Date(plan.starts_at).getTime() <= now && now <= new Date(plan.ends_at).getTime();
  const rotation = ROTATIONS[rotationSeed % ROTATIONS.length];

  return (
    <div className={`relative bg-card ${rotation} rounded-card p-3 shadow-[2px_4px_8px_rgba(0,0,0,0.28)]`}>
      <span className="absolute -top-1.5 left-4 h-2.5 w-2.5 rounded-full bg-accent shadow-[0_2px_3px_rgba(0,0,0,0.35)]" />
      <p className="font-display font-bold text-ink">{plan.text}</p>
      <div className="mt-2 flex items-center justify-between border-t border-dashed border-rule pt-2 font-mono text-[10px] text-ink2">
        {isLive ? (
          <span className="flex items-center gap-1 font-bold text-accent">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            LIVE
          </span>
        ) : (
          <span>ENDED</span>
        )}
        <span>{new Date(plan.ends_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
      </div>
    </div>
  );
}
