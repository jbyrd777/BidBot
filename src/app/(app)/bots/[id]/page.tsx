import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { ChatScreen } from "@/components/team/chat-screen";
import { getBot } from "@/lib/team/store";
import { getWorkspace } from "@/lib/workspace/load";

export const instant = false;

export async function generateMetadata({ params }: PageProps<"/bots/[id]">) {
  const { id } = await params;
  return { title: getBot(await getWorkspace(), id)?.name ?? "Bot" };
}

export default async function BotPage({ params }: PageProps<"/bots/[id]">) {
  const { id } = await params;
  await connection();
  if (id === "chief") redirect("/");
  const ws = await getWorkspace();
  const bot = getBot(ws, id);
  if (!bot) notFound();
  return <ChatScreen ws={ws} botId={bot.id} />;
}
