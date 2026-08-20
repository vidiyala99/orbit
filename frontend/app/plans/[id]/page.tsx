import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchPlan, startThread } from "@/lib/api";

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get("sc_token")?.value ?? "";
  const plan = await fetchPlan(id, token);

  const now = Date.now();
  const isLive = new Date(plan.starts_at).getTime() <= now && now <= new Date(plan.ends_at).getTime();

  async function messagePoster() {
    "use server";
    const t = (await cookies()).get("sc_token")?.value ?? "";
    const thread = await startThread(plan.user_id, t);
    redirect(`/chats/${thread.id}`);
  }

  return (
    <main className="flex justify-center p-6">
      <div className="relative w-full max-w-sm rotate-[-0.8deg] rounded-card bg-card p-5 shadow-[3px_6px_14px_rgba(0,0,0,0.32)]">
        <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-accent" />
        <p className="font-mono text-[10px] uppercase tracking-wide text-ink2">Plan</p>
        <h1 className="font-display text-xl font-bold text-ink">{plan.text}</h1>
        <div className="my-3 flex justify-between border-y border-dashed border-rule py-3">
          <div>
            <p className="font-mono text-[9.5px] uppercase text-ink2">Status</p>
            <p className="font-mono text-xs font-bold text-accent">{isLive ? "LIVE NOW" : "ENDED"}</p>
          </div>
          <div>
            <p className="font-mono text-[9.5px] uppercase text-ink2">Until</p>
            <p className="font-mono text-lg font-bold text-accent">
              {new Date(plan.ends_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
        </div>
        <form action={messagePoster}>
          <button type="submit" className="mt-2 w-full rounded-full bg-ink py-3 font-display font-semibold text-card">
            Message
          </button>
        </form>
      </div>
    </main>
  );
}
