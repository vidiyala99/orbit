import Link from "next/link";
import { PlanT } from "@/lib/types";
import PlanCard from "./PlanCard";

export default function PlanFeed({
  plans,
  signedIn = false,
}: {
  plans: PlanT[];
  /** Signed-out visitors can't post, so they get the neutral empty state. */
  signedIn?: boolean;
}) {
  if (plans.length === 0) {
    return (
      <div className="p-4">
        <div className="relative mx-auto max-w-sm rotate-[-1deg] rounded-card bg-card p-6 text-center shadow-[3px_6px_14px_rgba(0,0,0,0.32)]">
          <span
            className="absolute -top-2 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-accent shadow-[0_2px_3px_rgba(0,0,0,.35)]"
            aria-hidden="true"
          />
          <p className="font-mono text-xs text-ink2">No plans pinned near you yet.</p>
          {signedIn && (
            <>
              <p className="mt-2 font-hand text-xl text-ink">
                First one in a city is always the quietest — that&apos;s usually you.
              </p>
              <Link
                href="/post"
                className="btn-press mt-4 inline-block rounded-full bg-ink px-5 py-2.5 font-display text-sm font-semibold text-card"
              >
                + Post a plan
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4 p-4">
      {plans.map((plan, i) => (
        <Link key={plan.id} href={`/plans/${plan.id}`} className="block">
          <PlanCard plan={plan} rotationSeed={i} />
        </Link>
      ))}
    </div>
  );
}
