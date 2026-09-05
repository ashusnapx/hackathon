"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { authConfig } from "./config";

/**
 * The signed-in user's own client.
 *
 * One instance per tab: `createBrowserClient` keeps the session in cookies the
 * server can also read, and building a second one would leave two things
 * refreshing the same token against each other.
 */
let client: SupabaseClient | null = null;

export function authClient(): SupabaseClient {
  const config = authConfig();
  if (!config) throw new Error("auth-not-configured");
  client ??= createBrowserClient(config.url, config.key);
  return client;
}
