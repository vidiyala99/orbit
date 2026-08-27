import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchMe, fetchRoom, fetchRoomMessages, fetchRoomProposals } from "@/lib/api";
import SectionNav from "@/components/SectionNav";
import RoomMembership from "@/components/RoomMembership";
import RoomWorkspace from "@/components/RoomWorkspace";
import { locationLabel, memberLabel, purposeLabel } from "@/lib/rooms";

const LABEL = "text-[11px] font-bold text-ink3";

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const token = (await cookies()).get("sc_token")?.value;
  if (!token) redirect("/sign-in");

  const { roomId } = await params;
  const room = await fetchRoom(roomId, token);
  const isPublic = room.visibility === "public";

  // The thread and the schedule are members-only on the API, so they're only
  // read — and only rendered — once membership is established.
  const [me, messages, proposals] = room.is_member
    ? await Promise.all([
        fetchMe(token),
        fetchRoomMessages(roomId, token),
        fetchRoomProposals(roomId, token),
      ])
    : [null, [], []];

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-ground pb-28 md:max-w-5xl md:pb-10 md:pt-16">
      <div className="px-[18px] pt-4">
        {/* Explicitly labelled: the visible text is just "Rooms", which would
            otherwise collide with the "Rooms" tab in the bottom nav for anyone
            navigating by link name. */}
        <Link
          href="/rooms"
          aria-label="Back to rooms"
          className="inline-block rounded-full text-[12.5px] font-semibold text-ink3 transition-colors hover:text-ink"
        >
          ← Rooms
        </Link>
      </div>

      <div className="px-[18px] pb-4 pt-3">
        <div className="rounded-card bg-surface p-4 shadow-card">
          <div className="flex items-start justify-between gap-2">
            <h1 className="min-w-0 text-[19px] font-extrabold tracking-[-0.3px] text-ink">
              {room.name}
            </h1>
            <span
              className={`mt-1 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em] ${
                isPublic ? "bg-accent-soft text-accent" : "bg-rule/60 text-ink2"
              }`}
            >
              {isPublic ? "Public" : "Private"}
            </span>
          </div>
          <p className="mt-1 text-[13px] font-medium text-ink2">{purposeLabel(room.purpose)}</p>
          <p className="mt-0.5 font-mono text-[10.5px] text-ink3">{locationLabel(room)}</p>

          {/* The rooms API returns a member count, not a roster, so the "member
              list" is the count plus a stack standing in for those people. */}
          <div className="mt-4 border-t border-rule pt-3.5">
            <p className={LABEL}>Members</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex" aria-hidden="true">
                {Array.from({ length: Math.min(Math.max(room.member_count, 1), 4) }).map((_, i) => (
                  <span
                    key={i}
                    className="-ml-1.5 h-5 w-5 rounded-full bg-rule ring-2 ring-surface first:ml-0"
                    style={{ opacity: 1 - i * 0.12 }}
                  />
                ))}
              </div>
              <span className="font-mono text-[10.5px] text-ink3">
                {memberLabel(room.member_count)}
              </span>
            </div>
          </div>

          <RoomMembership room={room} />
        </div>
      </div>

      {room.is_member && me && (
        <RoomWorkspace
          roomId={room.id}
          currentUserId={me.id}
          initialMessages={messages}
          initialProposals={proposals}
        />
      )}

      <SectionNav />
    </main>
  );
}
