import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchMyThreads } from "@/lib/api";
import { requireOnboarded } from "@/lib/requireOnboarded";
import SectionNav from "@/components/SectionNav";
import { ThreadSummaryT } from "@/lib/types";

function displayName(other: ThreadSummaryT["other_user"]): string {
  const name = [other.first_name, other.last_name].filter(Boolean).join(" ").trim();
  return name || "Someone";
}

/** Short inbox-style age: "now", "30m", "3h", "2d", then a calendar date. */
function relativeTime(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

function ThreadRow({ thread, meId }: { thread: ThreadSummaryT; meId: string | undefined }) {
  const last = thread.last_message;
  const preview = last ? `${last.sender_id === meId ? "You: " : ""}${last.body}` : "Say hi —";

  return (
    <Link
      href={`/chats/${thread.id}`}
      className="lift block rounded-card bg-surface p-4 shadow-card hover:shadow-card-hover"
    >
      <div className="flex items-center gap-3">
        {/* Initial-in-a-disc rather than a bare accent circle: it identifies
            the person and stops the accent being spent on decoration. */}
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent"
        >
          {displayName(thread.other_user).charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[14px] font-bold text-ink">
              {displayName(thread.other_user)}
            </span>
            {last && (
              <span className="shrink-0 font-mono text-[10.5px] text-ink3">
                {relativeTime(last.created_at)}
              </span>
            )}
          </div>
          <p
            className={`mt-0.5 truncate text-[12.5px] ${
              last ? "text-ink2" : "italic text-ink3"
            }`}
          >
            {preview}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default async function ChatsPage() {
  // Same gate as /rooms: an inbox is meaningless to a signed-out visitor.
  const token = (await cookies()).get("sc_token")?.value;
  if (!token) redirect("/sign-in");

  const user = await requireOnboarded();
  const threads = await fetchMyThreads(token);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-ground pb-28 md:pb-10 md:pt-16">
      <header className="px-[18px] pb-1 pt-5">
        <h1 className="text-[23px] font-extrabold leading-tight tracking-[-0.3px] text-ink">Chats</h1>
        <p className="mt-[3px] text-xs font-medium text-ink3">People you&apos;ve talked to</p>
      </header>

      {threads.length === 0 ? (
        <div className="px-[18px] py-2">
          <div className="mx-auto max-w-sm rounded-card bg-surface p-6 text-center shadow-card">
            <p className="text-base font-bold leading-snug text-ink">
              Message someone from a plan or room to start one.
            </p>
            <p className="mt-2 text-[13px] text-ink2">No conversations yet.</p>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-3 px-[18px] py-2">
          {threads.map((thread) => (
            <li key={thread.id}>
              <ThreadRow thread={thread} meId={user?.id} />
            </li>
          ))}
        </ul>
      )}

      <SectionNav userInitial={user?.first_name?.charAt(0).toUpperCase()} />
    </main>
  );
}
