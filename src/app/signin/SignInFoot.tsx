"use client";

import { useT } from "@/lib/i18n/context";

/**
 * The emergency numbers, under the form on every screen size.
 *
 * Deliberately not in the illustration panel. Somebody who is being defrauded
 * right now needs 1930 more than they need an account, and putting that line
 * in the half of the page that disappears on a phone would hide it from most
 * of the people it is for.
 */
export function SignInFoot() {
  return <p className="mt-8 text-sm leading-[1.6] text-ink-3">{useT()("auth.emergency")}</p>;
}
