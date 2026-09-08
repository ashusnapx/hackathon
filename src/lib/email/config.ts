/**
 * Reading the Gmail credentials, and nothing else.
 *
 * Split out of `send.ts` because that module is `server-only` — importing it to
 * check whether an app password parses would drag nodemailer and a build-time
 * guard into a unit test. This file has no imports at all, which is what lets
 * the parsing rules below actually be tested rather than assumed.
 *
 * There are no credentials in this file, and there must never be. An earlier
 * version carried the project mailbox and its app password as a fallback, on
 * the reasoning that a hackathon deployment whose environment variables had not
 * arrived would at least still send. That reasoning was wrong twice over: a
 * password in a repository is public the moment the repository is, so it is
 * spent whether or not anybody notices; and the fallback hid the very failure
 * it was meant to survive, because email kept working locally while the
 * deployment was misconfigured, so nobody found out until it mattered.
 *
 * Missing configuration is now reported as missing. `/api/health` says email is
 * off, the footer says so, and the fix is to set the variable.
 */

/**
 * Only the keys these functions read. `NodeJS.ProcessEnv` would do at the call
 * sites, but it demands `NODE_ENV` from every caller — which turns a test for
 * "does a blank password count as configured" into a fake environment.
 */
export interface EmailEnv {
  GMAIL_USER?: string;
  GMAIL_APP_PASSWORD?: string;
  GMAIL_APP_PASS?: string;
  /** `process.env` carries far more than this; accept it without listing it. */
  [key: string]: string | undefined;
}

/**
 * The app password, however it was pasted in.
 *
 * Two things went wrong here often enough to be worth handling rather than
 * documenting. Google shows an app password as four groups of four —
 * "abcd efgh ijkl mnop" — and the spaces are display only; sent verbatim they
 * make a 19-character password that Gmail rejects with an auth error that
 * mentions neither spaces nor length. And the variable has been written both as
 * `GMAIL_APP_PASSWORD` and as `GMAIL_APP_PASS`, the second of which the code
 * did not read at all, so email reported itself "not configured" on a
 * deployment that had the credential sitting right there.
 *
 * Both names are accepted and all whitespace is stripped, because there is no
 * valid app password containing a space.
 */
export function emailAppPassword(env: EmailEnv = process.env): string | null {
  const raw = env.GMAIL_APP_PASSWORD ?? env.GMAIL_APP_PASS;
  const cleaned = raw?.replace(/\s+/g, "") ?? "";
  return cleaned.length ? cleaned : null;
}

export function emailUser(env: EmailEnv = process.env): string | null {
  const user = (env.GMAIL_USER ?? "").trim();
  return user.length ? user : null;
}

export function emailConfigured(env: EmailEnv = process.env): boolean {
  return Boolean(emailUser(env) && emailAppPassword(env));
}
