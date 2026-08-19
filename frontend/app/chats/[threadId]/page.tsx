import { auth } from "@clerk/nextjs/server";
import { fetchMe, fetchMessages } from "@/lib/api";
import ChatThread from "@/components/ChatThread";

export default async function ChatPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const { getToken } = await auth();
  const token = (await getToken()) ?? "";
  // `me.id` is the backend UUID that messages' sender_id references — Clerk's
  // userId would never match and every bubble would render as the other side's.
  const [me, messages] = await Promise.all([fetchMe(token), fetchMessages(threadId, token)]);

  return (
    <ChatThread threadId={threadId} initialMessages={messages} currentUserId={me.id} token={token} />
  );
}
