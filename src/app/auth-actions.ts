"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { dbConfigured } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";

/** Only follow redirects back into this app, never to another site. */
function safeNext(next: FormDataEntryValue | null) {
  const n = String(next ?? "/");
  return n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

async function origin() {
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

export async function signIn(formData: FormData) {
  const next = safeNext(formData.get("next"));
  if (!dbConfigured()) redirect(next);
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent("That email and password don't match. Try again or reset your password.")}&next=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function signUp(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (password.length < 10) redirect(`/login?mode=signup&error=${encodeURIComponent("Use at least 10 characters for the password.")}&next=${encodeURIComponent(next)}`);
  const sb = await supabaseServer();
  const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}` } });
  if (error) redirect(`/login?mode=signup&error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  if (data.session) redirect(next);
  redirect(`/login?sent=${encodeURIComponent(email)}`);
}

export async function resetPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const sb = await supabaseServer();
  await sb.auth.resetPasswordForEmail(email, { redirectTo: `${await origin()}/auth/callback?next=/settings` });
  redirect(`/login?sent=${encodeURIComponent(email)}`);
}
