import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const OPEN = ["/login", "/auth", "/invite"];

/** Keeps the sign in session fresh on every request, and sends signed out visitors to the login page. */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (!data.user && !OPEN.some((p) => path.startsWith(p))) {
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.search = path === "/" ? "" : `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(to);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|favicon.ico|.*\\.(?:png|jpg|svg|webp)$).*)"],
};
