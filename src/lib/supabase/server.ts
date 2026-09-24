import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getEnv } from "@/server/config/env";

/**
 * Supabase clients for the SERVER (route handlers, server components, repositories).
 *
 * NOT USED YET: no module reads or writes through Supabase; every repository is still an in-memory
 * stub. These are the ready-made entry points for replacing them (one table per repository).
 */

function config() {
  const env = getEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  return { url, anonKey, serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY };
}

/** Whether the Supabase variables are present (lets callers fall back instead of throwing). */
export const isSupabaseConfigured = () => {
  const env = getEnv();
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
};

/**
 * A client that acts as the signed-in *Supabase Auth* user (session in cookies) and is bound by
 * Row Level Security. Kandrop does not use Supabase Auth today, so for now this behaves as the
 * anonymous role. Create one per request: never keep it in a module-level variable.
 */
export async function createClient() {
  const { url, anonKey } = config();
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only. Harmless: a proxy
          // that refreshes the session (not needed while we use our own login) would do it.
        }
      },
    },
  });
}

/**
 * A client with the SERVICE ROLE key: it BYPASSES Row Level Security, so it can read and write any
 * row of any store. Because our login is a custom session, this is the client repositories should
 * use — and every query must then filter by `store_id` itself (tenant scoping is on us, as in the
 * current repositories). Server only: the key must never reach the browser, and this refuses to run
 * there.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient() must only run on the server");
  }
  const { url, serviceRoleKey } = config();
  if (!serviceRoleKey) throw new Error("Supabase admin access needs SUPABASE_SERVICE_ROLE_KEY");
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
