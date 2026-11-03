import { connection } from "next/server";
import { ChatScreen } from "@/components/team/chat-screen";
import { getWorkspace } from "@/lib/workspace/load";

export const instant = false;

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  await connection();
  const ws = await getWorkspace();
  return <ChatScreen ws={ws} botId="chief" initial={typeof params.q === "string" ? params.q : undefined} />;
}
