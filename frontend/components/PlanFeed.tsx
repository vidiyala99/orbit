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
      <div className="px-[18px] py-2">
        <div className="mx-auto max-w-sm rounded-card bg-surface p-6 text-center shadow-card">
          {signedIn ? (
            <>
              <p className="text-base font-bold leading-snug text-ink">
                First one in a city is always the quietest — that&apos;s usually you.
              </p>
              <p className="mt-2 text-[13px] text-ink2">No plans pinned near you yet.</p>
              <Link
                href="/post"
                className="lift btn-press mt-5 inline-block rounded-full bg-ink px-5 py-2.5 text-[13.5px] font-bold text-ground shadow-raised hover:shadow-raised-hover"
              >
                + Post a plan
              </Link>
            </>
          ) : (
            <p className="text-[13px] text-ink2">No plans pinned near you yet.</p>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 px-[18px] py-2">
      {plans.map((plan) => (
        <Link key={plan.id} href={`/plans/${plan.id}`} className="block rounded-card">
          <PlanCard plan={plan} />
        </Link>
      ))}
    </div>
  );
}
