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
  "/api/health",
  "/api/vaani/webhook",
  "/api/cron/advisories",
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
