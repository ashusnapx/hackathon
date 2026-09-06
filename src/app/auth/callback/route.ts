import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { authConfig } from "@/lib/auth/config";
import { safeRedirect, SIGN_IN_PATH } from "@/lib/auth/routes";

/**
 * Where a confirmation link lands.
 *
 * Supabase does not sign anybody in by itself. Clicking the link in the email
 * proves the address exists and sends the browser back here with a one-time
 * code; the session only exists once that code is exchanged. Without this
 * handler the link arrives at a page holding a `?code=` nothing reads, the gate
 * sees no session, and the person is bounced to sign-in having just confirmed
 * their address — which reads, correctly, as the product being broken.
 *
 * The exchange has to happen on the server. `@supabase/ssr` keeps the PKCE
 * verifier in a cookie rather than in `localStorage` precisely so that this
 * request can complete the handshake and set the session cookie the middleware
 * will read on the very next navigation.
 *
 * Cookies are written onto the response we return, not through the request
 * store. A redirect built afterwards would not carry them, and the person would
 * arrive signed out with no sign of why.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const config = authConfig();

  // One destination for every way this can fail, and it never says which.
  // "Expired", "already used" and "wrong browser" are the same problem to the
  // person holding the email, and distinguishing them out loud would tell a
  // stranger whether a link they found is still live.
  const failed = url.clone();
  failed.pathname = SIGN_IN_PATH;
  failed.search = "";
  failed.searchParams.set("error", "link");

  const code = url.searchParams.get("code");
  if (!config || !code) return NextResponse.redirect(failed);

  // `next` came in on a URL, so it is a stranger's to set: same treatment as
  // the sign-in form gives it.
  const [pathname, query = ""] = safeRedirect(url.searchParams.get("next")).split("?");
  const done = url.clone();
  done.pathname = pathname;
  done.search = query;

  const response = NextResponse.redirect(done);

  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (written) => {
        for (const { name, value, options } of written) response.cookies.set(name, value, options);
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return error ? NextResponse.redirect(failed) : response;
}
