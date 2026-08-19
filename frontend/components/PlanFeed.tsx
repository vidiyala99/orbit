import Link from "next/link";
import { PlanT } from "@/lib/types";
import PlanCard from "./PlanCard";

export default function PlanFeed({ plans }: { plans: PlanT[] }) {
  if (plans.length === 0) {
    return <p className="p-6 text-center font-mono text-xs text-rule">No plans pinned near you yet.</p>;
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
