"use client";

import { GuidedIntake } from "@/components/intake/GuidedIntake";
import { SiteHeader } from "@/components/SiteHeader";
import { useT } from "@/lib/i18n/context";

/**
 * The WhatsApp prototype, on its own page.
 *
 * It used to be a third tab inside the interview, which put a channel choice in
 * front of somebody who had already made one. It is not really a channel
 * anyway: it is an argument — that this whole product fits inside the app four
 * hundred million people in India already have, and that we have built enough
 * of it to show rather than to promise.
 *
 * So it gets a page that says what it is. Everything below the banner is the
 * real interview with the real model behind it; only the chrome is a replica,
 * and the banner says so rather than letting anybody assume a Meta integration
 * that does not exist.
 */
export function WhatsAppDemo() {
  const t = useT();
  return (
    <>
      <SiteHeader width="6xl" />
      <main id="main" className="mx-auto max-w-2xl px-5 sm:px-8 py-6 sm:py-10">
        <h1 className="text-[1.75rem] sm:text-3xl leading-tight">{t("wa.title")}</h1>
        <p className="mt-2 text-[1.0625rem] leading-[1.5] text-ink-2">{t("wa.sub")}</p>

        {/* The one thing on this page. Everything that was around it — three
            benefit cards and a paragraph of justification — was explaining a
            demo that explains itself the moment somebody taps it. */}
        <div className="mt-6">
          <GuidedIntake lockChannel="whatsapp" />
        </div>

        <details className="mt-6">
          <summary className="inline-flex min-h-11 items-center text-sm text-ink-3 underline underline-offset-4 cursor-pointer hover:text-ink">
            {t("wa.realQ")}
          </summary>
          <p className="mt-2 text-sm leading-[1.6] text-ink-2">{t("wa.notReal")}</p>
        </details>

        <div className="mt-2 flex flex-col items-start">
          <a href="/say" className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">{t("talk.typeLink")} →</a>
          <a href="/talk" className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">{t("begin.voiceLink")} →</a>
        </div>
      </main>
    </>
  );
}
