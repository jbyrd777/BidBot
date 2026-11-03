import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** Where confirmation and reset emails land: trade the one time code for a session, then go on. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const raw = request.nextUrl.searchParams.get("next") ?? "/";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  if (code) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  return NextResponse.redirect(new URL("/login?error=" + encodeURIComponent("That link has expired. Sign in or request a new one."), request.url));
}
