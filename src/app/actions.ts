"use server";

import { revalidatePath } from "next/cache";
import { decide, type Decision } from "@/packs/construction/store";
import { commit } from "@/lib/workspace/commit";
import { getWorkspace } from "@/lib/workspace/load";
import { CAN_DECIDE } from "@/lib/workspace/types";

export async function setDecision(formData: FormData) {
  const id = String(formData.get("id"));
  const decision = String(formData.get("decision")) as Decision;
  if (!["bid", "no_bid", "pending"].includes(decision)) return;
  const ws = await getWorkspace();
  if (!CAN_DECIDE.includes(ws.me.role)) throw new Error("Your role can't make bid calls. Ask an owner, admin, sales or estimating lead.");
  decide(ws, id, decision);
  await commit(ws);
  revalidatePath("/", "layout");
}
