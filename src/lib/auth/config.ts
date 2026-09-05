/**
 * The public half of the Supabase project.
 *
 * These two are `NEXT_PUBLIC_` on purpose and are not a secret: the publishable
 * key is designed to sit in a browser, and everything it can reach is decided
 * by row-level security rather than by hiding the string. The secret key, which
 * bypasses RLS, lives in `lib/db/supabase.ts` and never leaves the server.
 */
export function authConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return url && key ? { url, key } : null;
}

export function authConfigured(): boolean {
  return authConfig() !== null;
}
