import type { PostgrestError } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * The database handle every repository uses: the service-role client (our login is a custom
 * session, so Row Level Security cannot identify the caller). Because it bypasses RLS, every query
 * on tenant data MUST filter by `store_id` itself.
 */
export const db = () => createAdminClient();

/** Unwraps a Supabase result: the data, or a thrown error (logged without row contents). */
export function must<T>(op: string, result: { data: T; error: PostgrestError | null }): T {
  if (result.error) {
    console.error(`[db] ${op} failed:`, result.error.code, result.error.message);
    throw new Error(`Database error: ${op}`);
  }
  return result.data;
}

/** Like `must`, for a list query (an empty list when Supabase returns no rows). */
export function rows<T>(op: string, result: { data: T[] | null; error: PostgrestError | null }): T[] {
  return must(op, result) ?? [];
}

/** Postgres unique-violation. */
export const isUniqueViolation = (error: PostgrestError | null) => error?.code === "23505";
