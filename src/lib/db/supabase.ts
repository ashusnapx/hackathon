import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The database connection, which exists only on the server.
 *
 * This uses the secret key, which bypasses row-level security entirely. That is
 * safe exactly once: when it never leaves the server and every route that holds
 * it has already checked the caller's case key. It is not a `NEXT_PUBLIC_`
 * variable and must never become one — the guard below turns a mistaken client
 * import into a loud failure rather than a silent leak.
 */

let client: SupabaseClient | null = null;

export function databaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SECRET_KEY?.trim());
}

export function database(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("the service-role client must never be constructed in a browser");
  }
  if (!databaseConfigured()) throw new Error("database-not-configured");
  client ??= createClient(
    process.env.SUPABASE_URL!.trim(),
    process.env.SUPABASE_SECRET_KEY!.trim(),
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { "x-client-info": "kavach" } },
    },
  );
  return client;
}
