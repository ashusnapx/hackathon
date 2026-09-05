import type { Session, User } from "@supabase/supabase-js";

import type { DictKey } from "@/lib/i18n/dict/en";

/**
 * What we can honestly say about the person signed in.
 *
 * Every value here comes from the account itself rather than from anything we
 * inferred, and a field the provider did not give us reads as unknown instead
 * of as a plausible blank. The panel is the one place someone can check what
 * this product is holding about them, so it should not round anything off.
 *
 * Times are shown as a relative phrase in the reader's own language, with the
 * exact stamp on the element's title. `Intl.RelativeTimeFormat` does that for
 * every locale without a dictionary entry per unit — and without the English
 * "2 hr 5 min" that the rest of the app's elapsed readouts use, which would be
 * the wrong register on a page written in Tamil.
 */

export interface AccountRow {
  key: DictKey;
  /** Something already formatted — a time, a count — printed as it stands. */
  value?: string | null;
  /** Something that is a sentence, and therefore lives in the dictionary. */
  valueKey?: DictKey;
  /** The exact moment, for a tooltip — a relative phrase alone loses it. */
  title?: string;
}

export interface AccountFacts {
  verified: boolean;
  rows: AccountRow[];
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60_000],
  ["month", 30 * 24 * 60 * 60_000],
  ["day", 24 * 60 * 60_000],
  ["hour", 60 * 60_000],
  ["minute", 60_000],
  ["second", 1_000],
];

/**
 * "3 minutes ago", "in 58 minutes" — in whatever language is being read.
 *
 * A locale the browser has never heard of throws rather than falling back, so
 * this drops to the default locale instead of taking the panel down with it.
 */
export function relativeTime(iso: string, now: number, locale = "en"): string | null {
  const at = new Date(iso).getTime();
  if (!Number.isFinite(at)) return null;
  const delta = at - now;
  const unit = UNITS.find(([, ms]) => Math.abs(delta) >= ms) ?? UNITS[UNITS.length - 1];
  const amount = Math.round(delta / unit[1]);
  const format = (tag?: string) =>
    new Intl.RelativeTimeFormat(tag, { numeric: "auto" }).format(amount, unit[0]);
  try {
    return format(locale);
  } catch {
    return format(undefined);
  }
}

function exact(iso: string, locale: string): string | undefined {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return undefined;
  try {
    return at.toLocaleString(locale, { dateStyle: "full", timeStyle: "short" });
  } catch {
    return at.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });
  }
}

/** How this account signs in, said in words rather than as a provider slug. */
function method(user: User): DictKey | null {
  const provider = typeof user.app_metadata?.provider === "string" ? user.app_metadata.provider : null;
  if (!provider) return null;
  return provider === "email" ? "account.methodPassword" : "account.methodOther";
}

export function accountFacts(
  user: User,
  session: Session | null,
  now: number,
  locale = "en",
): AccountFacts {
  const at = (key: DictKey, iso: string | null | undefined): AccountRow => ({
    key,
    value: iso ? relativeTime(iso, now, locale) : null,
    title: iso ? exact(iso, locale) : undefined,
  });

  const expiresAt = session?.expires_at
    ? new Date(session.expires_at * 1_000).toISOString()
    : null;

  const rows: AccountRow[] = [
    at("account.lastSignIn", user.last_sign_in_at),
    at("account.memberSince", user.created_at),
    at("account.confirmedOn", user.email_confirmed_at),
  ];

  const signInMethod = method(user);
  if (signInMethod) rows.push({ key: "account.method", valueKey: signInMethod });

  rows.push(at("account.sessionEnds", expiresAt));

  return { verified: Boolean(user.email_confirmed_at), rows };
}
