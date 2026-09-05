import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { authConfig } from "./config";

/**
 * The session, as a server component or route handler sees it.
 *
 * Writing cookies is allowed from a route handler and refused from a server
 * component, which is why `setAll` is allowed to fail quietly: the middleware
 * has already refreshed the session on this request, so a component that cannot
 * write is not losing anything.
 */
export async function authServer(): Promise<SupabaseClient | null> {
  const config = authConfig();
  if (!config) return null;
  const store = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (written) => {
        try {
          for (const { name, value, options } of written) store.set(name, value, options);
        } catch {
          // A server component cannot set cookies. The middleware already did.
        }
      },
    },
  });
}

/** Who is signed in, verified against Supabase rather than read off a cookie. */
export async function currentUser() {
  const supabase = await authServer();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}
