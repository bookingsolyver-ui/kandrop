import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for the BROWSER (client components). Uses the public anon key, so it can only
 * do what Row Level Security allows: never put anything sensitive behind it.
 *
 * NOT USED YET: the platform still keeps its data in memory (see `docs/DEPLOY.md`). Kandrop's own
 * login is a custom JWT session, not Supabase Auth, so `auth.uid()` in a policy would be empty for
 * our users: until that is decided, do data access from the server (`./server`), not from here.
 *
 * The two variables are read as literal `process.env.NEXT_PUBLIC_*` expressions on purpose:
 * that is the only form Next.js can inline into the browser bundle.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  return createBrowserClient(url, anonKey);
}
