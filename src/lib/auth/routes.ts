import { DEMO_CASE_PATH } from "@/lib/demo/id";

/**
 * What a stranger may still reach.
 *
 * The app is behind a sign-in. This is the short list of exceptions, kept as a
 * plain function rather than a regex in the middleware config so that it can be
 * read, argued with and tested — a route that leaks because a pattern was one
 * character out is not the kind of bug you find by looking.
 *
 * Each exception earns its place:
 *
 *  - The landing page, which has to be readable by somebody deciding whether to
 *    trust this at all.
 *  - The sign-in page itself, or there would be no way in.
 *  - The sample case, which is linked from the landing page as the proof that
 *    any of this works. It holds one call committed to this repository and no
 *    real person's data.
 *  - The health endpoint, because the status line in the landing page's footer
 *    is rendered for signed-out readers too.
 *  - The provider's own webhook, which is called by Vaani's servers and has no
 *    session to present. It carries its own signature check.
 *  - The nightly advisory refresh, which Vercel's scheduler calls with no
 *    session at all. Gating it here would mean the job never runs; it carries
 *    its own shared-secret check instead, and refuses every request when no
 *    secret is configured rather than defaulting open.
 *  - The confirmation-link handler, which is where somebody arrives *before*
 *    they have a session. Gating it would bounce them to sign-in holding an
 *    unredeemed code, which is the one place the gate would defeat itself.
 */
export const SIGN_IN_PATH = "/signin";

export const AUTH_CALLBACK_PATH = "/auth/callback";

const PUBLIC_PATHS = new Set<string>([
  "/",
  SIGN_IN_PATH,
  AUTH_CALLBACK_PATH,
  DEMO_CASE_PATH,
  /*
   * The interview, and everything it needs before anybody has an account.
   *
   * ── Why this is a list and not one path ─────────────────────────────────
   *
   * The first attempt at this opened `/assist` alone, which was worse than
   * leaving it shut: the page rendered, the microphone worked, and then the
   * button did nothing because `/api/ai/triage` answered 401. A door that
   * opens onto a wall is a crueller failure than a locked door, and it took
   * testing the whole path rather than the route to find it.
   *
   * So the rule is the journey, not the page. Everything a person touches
   * between arriving and having a case is here: the three ways in, the
   * questions, and the four endpoints those screens actually call.
   *
   * ── What stays shut, and why that is not arbitrary ──────────────────────
   *
   * Nothing here reads or writes a stored case. `/assist` and `/say` keep the
   * draft in the browser's own storage; a case reaches the server only once it
   * has a key, and every route that touches one still demands that key on top
   * of the session. `/api/cases/*`, `/cases` and the account screens are
   * therefore still gated, and there is a test below that says so — because
   * the failure mode of a list like this is that it grows one convenient
   * exception at a time until the gate means nothing.
   */
  "/start",
  "/assist",
  "/say",
  "/say/questions",
  "/api/ai/triage",
  "/api/ai/transcribe",
  "/api/whatsapp/claim",
  "/api/health",
  "/api/vaani/webhook",
  // Meta has no session and never will. This route authenticates every request
  // itself, by HMAC over the raw body against the app secret — a stronger check
  // than the cookie this gate looks for, and the only one Meta can satisfy.
  // Behind the gate it answered 401 to the subscription handshake, so the
  // webhook could never have been registered at all.
  "/api/whatsapp/webhook",
  // Same reasoning for the Twilio sandbox transport: Twilio has no session and
  // signs every request with HMAC-SHA1 over the URL and the form fields.
  "/api/whatsapp/twilio",
  "/api/cron/advisories",
  "/api/cron/reminders",
]);

/**
 * Prefixes Next.js and the browser ask for on their own, which never carry a
 * session and are not ours to gate.
 */
const PUBLIC_PREFIXES = ["/_next/", "/fonts/", "/images/"];

const PUBLIC_FILES = new Set<string>([
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
  "/opengraph-image",
  "/apple-touch-icon.png",
]);

/**
 * Normalise before deciding.
 *
 * A trailing slash, a repeated slash or a differently-cased path must not be a
 * way past the gate, and `/api/healthy` must not be let through because it
 * begins with `/api/health`.
 */
export function normalisePath(pathname: string): string {
  const collapsed = `/${pathname.split("/").filter(Boolean).join("/")}`;
  return collapsed.length > 1 ? collapsed.toLowerCase() : "/";
}

/**
 * The sample case's own screens.
 *
 * The sample is the one thing somebody can open without an account, and its
 * doors are now separate pages — `/case/demo-vaani-call/steps` and the rest —
 * so allowlisting only its home would put every screen behind it back behind
 * the sign-in wall. The trailing slash is what keeps this a prefix of the
 * sample rather than of anything merely beginning with the same characters.
 */
const DEMO_CASE_PREFIX = `${normalisePath(DEMO_CASE_PATH)}/`;

export function isPublicPath(pathname: string): boolean {
  const path = normalisePath(pathname);
  if (PUBLIC_PATHS.has(path)) return true;
  if (PUBLIC_FILES.has(path)) return true;
  if (path.startsWith(DEMO_CASE_PREFIX)) return true;
  return PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * Where the header's start button goes.
 *
 * `/start` is deliberately public and stays that way — the whole intake journey
 * is, so that somebody whose money left an hour ago is never made to create an
 * account before describing what happened. This decides only where one button
 * points, which is a different question from what the gate allows.
 *
 * The unknown case — session read not yet finished — points at sign-in rather
 * than at `/start`. For those few milliseconds "signed out" and "not asked yet"
 * look identical, and guessing `/start` would let a fast tap straight through;
 * guessing sign-in cannot go wrong in the other direction, because the sign-in
 * page sends anybody who already has a session on to `next` without stopping.
 * So the pessimistic guess is right either way and costs at worst one hop.
 *
 * With no Supabase project configured there is no sign-in to send anybody to,
 * and the button behaves as it always did.
 */
export function startHref(email: string | null, configured: boolean): string {
  if (!configured || email) return "/start";
  return `${SIGN_IN_PATH}?next=${encodeURIComponent("/start")}`;
}

/**
 * Where to send somebody after they sign in.
 *
 * Only a path on this site, and never the sign-in page itself — an open
 * redirect here would turn our own login into somebody else's phishing page.
 */
export function safeRedirect(next: string | null | undefined): string {
  if (!next) return "/start";
  // "//evil.com" and "https://evil.com" are both absolute; "/\evil.com" is
  // treated as protocol-relative by some browsers. None of them are ours.
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/start";
  if (normalisePath(next.split("?")[0]) === SIGN_IN_PATH) return "/start";
  return next;
}
