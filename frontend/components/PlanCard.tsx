import { PlanT } from "@/lib/types";

/** `rotationSeed` is a leftover from the pinned-paper era — cards are flat now,
 *  so it is accepted and ignored rather than churned through every caller. */
export default function PlanCard({ plan }: { plan: PlanT; rotationSeed?: number }) {
  const now = Date.now();
  const isLive = new Date(plan.starts_at).getTime() <= now && now <= new Date(plan.ends_at).getTime();

  return (
    <div className="lift rounded-card bg-surface p-4 shadow-card hover:shadow-card-hover">
      <p className="text-[13.5px] font-medium leading-relaxed text-ink">{plan.text}</p>
      <div className="mt-[11px] flex items-center justify-between border-t border-rule pt-2.5">
        {isLive ? (
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-accent">
            <span className="live-dot" aria-hidden="true" />
            LIVE
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-ink3">ENDED</span>
        )}
        <span className="font-mono text-[10.5px] text-ink3">
          {new Date(plan.ends_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
