"use client";

import { useT } from "@/lib/i18n/context";

/**
 * The words above the form, in the reader's own language.
 *
 * They are a client component only because the dictionary is: the page around
 * them stays a server component so the session can be checked before anything
 * renders.
 */
export function SignInCopy() {
  const t = useT();
  return (
    <>
      <h1 className="text-3xl sm:text-4xl">{t("auth.title")}</h1>
      <p className="mt-4 text-[1.0625rem] leading-[1.65] text-ink-2">{t("auth.sub")}</p>
      <p className="mt-3 text-sm leading-[1.6] text-ink-3">{t("auth.emergency")}</p>
    </>
  );
}
