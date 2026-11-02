"use server";

import { revalidatePath } from "next/cache";
import { decide, type Decision } from "@/lib/data/store";

export async function setDecision(formData: FormData) {
  const id = String(formData.get("id"));
  const decision = String(formData.get("decision")) as Decision;
  if (!["bid", "no_bid", "pending"].includes(decision)) return;
  decide(id, decision);
  revalidatePath("/", "layout");
}
