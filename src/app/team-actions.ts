"use server";

import { revalidatePath } from "next/cache";
import { respond } from "@/lib/team/engine";
import { forget, getBot, remember, resolve, setAutonomy, team, toggleAccess } from "@/lib/team/store";
import type { BotId } from "@/lib/team/types";
import { getCompany, reread } from "@/lib/data/store";
import { TRADES } from "@/lib/trades";

export async function sendMessage(botId: string, text: string) {
  const clean = text.trim().slice(0, 4000);
  if (!clean || !getBot(botId)) return;
  await respond(botId as BotId, clean);
  revalidatePath("/", "layout");
}

export async function answerApproval(id: string, ok: boolean) {
  resolve(id, ok);
  revalidatePath("/", "layout");
}

export async function saveAutonomy(botId: string, autonomy: "ask" | "auto") {
  setAutonomy(botId, autonomy);
  revalidatePath("/", "layout");
}

export async function flipAccess(botId: string, app: string) {
  toggleAccess(botId, app);
  revalidatePath("/vault");
}

export async function addFact(formData: FormData) {
  const text = String(formData.get("fact") ?? "").trim();
  if (text) remember(text.slice(0, 500), "chief");
  revalidatePath("/memory");
}

export async function removeFact(formData: FormData) {
  forget(String(formData.get("id")));
  revalidatePath("/memory");
}

export async function saveProfile(formData: FormData) {
  const s = team();
  const c = getCompany();
  s.you.name = String(formData.get("you_name") || s.you.name).slice(0, 80);
  s.you.about = String(formData.get("you_about") ?? s.you.about).slice(0, 400);
  const tradeKey = String(formData.get("trade") || c.trade);
  if (TRADES.some((t) => t.key === tradeKey) && tradeKey !== c.trade) {
    c.trade = tradeKey;
    c.settings.trade = tradeKey;
    reread();
  }
  const states = String(formData.get("states") ?? "")
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter((x) => x.length === 2);
  if (states.length) c.settings.serviceStates = states;
  const lead = Number(formData.get("lead"));
  if (lead >= 0 && lead < 60) c.settings.minLeadDays = lead;
  const cap = Number(formData.get("capacity"));
  if (cap > 0 && cap < 500) c.weeklyCapacity = cap;
  const main = String(formData.get("main_name") ?? "").trim();
  if (main) s.bots[0].name = main.slice(0, 40);
  revalidatePath("/", "layout");
}
