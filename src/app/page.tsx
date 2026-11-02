import { connection } from "next/server";
import { ChatScreen } from "@/components/team/chat-screen";

export const instant = false;

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  await connection();
  return <ChatScreen botId="chief" initial={typeof params.q === "string" ? params.q : undefined} />;
}
