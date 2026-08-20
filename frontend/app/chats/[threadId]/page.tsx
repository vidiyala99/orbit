import { cookies } from "next/headers";
import { fetchMe, fetchMessages } from "@/lib/api";
import ChatThread from "@/components/ChatThread";

export default async function ChatPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const token = (await cookies()).get("sc_token")?.value ?? "";
  // `me.id` is the backend UUID that messages' sender_id references.
  const [me, messages] = await Promise.all([fetchMe(token), fetchMessages(threadId, token)]);

  return (
    <ChatThread threadId={threadId} initialMessages={messages} currentUserId={me.id} token={token} />
  );
}
