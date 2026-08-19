import { auth } from "@clerk/nextjs/server";
import { fetchMessages } from "@/lib/api";
import ChatThread from "@/components/ChatThread";

export default async function ChatPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const { userId, getToken } = await auth();
  const token = (await getToken()) ?? "";
  const messages = await fetchMessages(threadId, token);

  return (
    <ChatThread threadId={threadId} initialMessages={messages} currentUserId={userId ?? ""} token={token} />
  );
}
