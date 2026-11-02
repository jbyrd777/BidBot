import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { ChatScreen } from "@/components/team/chat-screen";
import { getBot } from "@/lib/team/store";

export const instant = false;

export async function generateMetadata({ params }: PageProps<"/bots/[id]">) {
  const { id } = await params;
  return { title: getBot(id)?.name ?? "Bot" };
}

export default async function BotPage({ params }: PageProps<"/bots/[id]">) {
  const { id } = await params;
  await connection();
  if (id === "chief") redirect("/");
  const bot = getBot(id);
  if (!bot) notFound();
  return <ChatScreen botId={bot.id} />;
}
