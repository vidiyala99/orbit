import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchMe, fetchPlan, startThread } from "@/lib/api";
import SectionNav from "@/components/SectionNav";

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get("sc_token")?.value ?? "";
  const plan = await fetchPlan(id, token);
  // Signed out or viewing your own plan: there's no one to message.
  const viewer = token ? await fetchMe(token).catch(() => null) : null;
  const isOwnPlan = viewer?.id === plan.user_id;

  const now = Date.now();
  const isLive = new Date(plan.starts_at).getTime() <= now && now <= new Date(plan.ends_at).getTime();

  async function messagePoster() {
    "use server";
    const t = (await cookies()).get("sc_token")?.value ?? "";
    const thread = await startThread(plan.user_id, t);
    redirect(`/chats/${thread.id}`);
  }

  return (
    <main className="flex min-h-screen justify-center bg-ground px-[18px] pb-28 pt-6 md:pb-10 md:pt-16">
      <div className="h-fit w-full max-w-sm rounded-card bg-surface p-4 shadow-card">
        <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-ink3">Plan</p>
        <h1 className="mt-1 text-[19px] font-extrabold leading-snug tracking-[-0.3px] text-ink">
          {plan.text}
        </h1>
        <div className="my-3.5 flex justify-between border-y border-rule py-3.5">
          <div>
            <p className="text-[11px] font-bold text-ink3">Status</p>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] font-bold text-accent">
              {isLive && <span className="live-dot" aria-hidden="true" />}
              {isLive ? "Live now" : "Ended"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold text-ink3">Until</p>
            <p className="mt-1 font-mono text-[15px] text-ink">
              {new Date(plan.ends_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
        </div>
        {isOwnPlan ? (
          <p className="mt-2 text-center text-[13px] font-medium text-ink3">This is your plan</p>
        ) : token ? (
          <form action={messagePoster}>
            <button
              type="submit"
              className="lift btn-press mt-2 w-full rounded-full bg-ink py-3.5 text-sm font-bold text-ground shadow-raised hover:shadow-raised-hover"
            >
              Message
            </button>
          </form>
        ) : (
          <p className="mt-2 text-center text-[13px] font-medium text-ink3">
            Sign in to message the poster
          </p>
        )}
      </div>

      <SectionNav />
    </main>
  );
}
