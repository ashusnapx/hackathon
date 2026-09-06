import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { authConfig } from "@/lib/auth/config";
import { isPublicPath, SIGN_IN_PATH } from "@/lib/auth/routes";

/**
 * The gate.
 *
 * Every request that is not on the short public list has to carry a session.
 * This runs before any page or route handler, so a page never renders for
 * somebody who should not see it and an API route never spends a model call on
 * them either.
 *
 * Two details are load-bearing:
 *
 *  - `getUser()`, not `getSession()`. The session is read from a cookie the
 *    browser sent, and a cookie is whatever the browser says it is; `getUser`
 *    asks Supabase to verify the token. On a gate, "the cookie claims a user"
 *    is not good enough.
 *  - The response object is threaded through the cookie writer and returned as
 *    it stands. Supabase refreshes an expiring token here and sets new cookies
 *    on it; building a fresh `NextResponse` at the end would drop them and sign
 *    the person out mid-session.
 *
 * When Supabase is not configured at all the gate opens rather than shutting
 * the site down: a deployment missing its keys is a mistake to be fixed, not a
 * reason for every page to fail. It is not silent — `/api/health` reports auth
 * as off and the sign-in page says so in as many words.
 */
export async function proxy(request: NextRequest) {
  const config = authConfig();
  if (!config || isPublicPath(request.nextUrl.pathname)) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (written) => {
        for (const { name, value } of written) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of written) response.cookies.set(name, value, options);
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (!error && data.user) return response;

  // An API route gets an answer it can act on. Bouncing a fetch to an HTML
  // sign-in page would show up in the app as unparseable JSON.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "sign-in-required" }, { status: 401 });
  }

  const signIn = request.nextUrl.clone();
  signIn.pathname = SIGN_IN_PATH;
  signIn.search = "";
  signIn.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(signIn);
}

export const config = {
  /**
   * Everything except the files Next.js serves for itself. The real decision is
   * `isPublicPath`, which is tested; this only keeps the middleware off static
   * assets so it is not woken for every image on the page.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)"],
};
