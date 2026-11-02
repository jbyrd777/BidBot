import { localReply } from "@/lib/agent/local";
import { modelEnabled, modelReply } from "@/lib/agent/model";
import type { ChatReply, ChatTurn } from "@/lib/agent/types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { history?: ChatTurn[] } | null;
  const history = (body?.history ?? []).filter((t) => (t.role === "user" || t.role === "assistant") && typeof t.text === "string").slice(-20);
  const last = history.at(-1);
  if (!last || last.role !== "user" || !last.text.trim()) return Response.json({ error: "Send a message." }, { status: 400 });

  let reply: ChatReply;
  if (modelEnabled()) {
    try {
      reply = await modelReply(history);
    } catch {
      reply = localReply(last.text);
    }
  } else {
    reply = localReply(last.text);
  }
  return Response.json(reply);
}
