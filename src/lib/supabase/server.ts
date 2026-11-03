import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

/**
 * A Supabase client acting as the signed in person. Every query runs under their session,
 * so row level security decides what they can see; the app never uses a key that bypasses it for customer data.
 */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server components cannot set cookies; the proxy refreshes the session instead.
        }
      },
    },
  });
}
