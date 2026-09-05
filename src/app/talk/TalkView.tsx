"use client";

import { GuidedIntake } from "@/components/intake/GuidedIntake";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/context";

/**
 * Talking, in the same room as typing.
 *
 * The voice interview used to open the whole workbench — a hero, a channel
 * switcher, a case file down the side — which is a strange thing to show
 * somebody whose entire interaction is going to be a microphone. This is the
 * front door's shell with the call in the middle of it: same header, same
 * heading and sub, same emergency numbers underneath, same width. The only
 * thing that changes between the three ways in is what sits in the card.
 */
export function TalkView() {
  const t = useT();
  return (
    <>
      <SiteHeader width="2xl" />
      <main id="main" className="px-4 py-8 sm:py-12 flex items-start justify-center">
        <div className="w-full max-w-xl">
          <h1 className="text-[1.75rem] sm:text-3xl leading-tight">{t("talk.h")}</h1>
          <p className="mt-2 text-[1.0625rem] leading-[1.5] text-ink-2">{t("talk.short")}</p>

          <div className="mt-4">
            <GuidedIntake lockChannel="voice" />
          </div>

          <div className="mt-7 grid grid-cols-2 gap-2">
            <Button href="tel:1930" external variant="urgent" size="md">{t("begin.call1930short")}</Button>
            <Button href="tel:112" external variant="secondary" size="md">{t("begin.call112short")}</Button>
          </div>

          {/* The same fold as the front door: findable, never in the way. */}
          <details className="mt-6 group">
            <summary className="inline-flex min-h-11 items-center text-sm text-ink-3 underline underline-offset-4 cursor-pointer hover:text-ink">
              {t("begin.safeSummary")}
            </summary>
            <p className="mt-2 text-sm leading-[1.6] text-ink-2">{t("begin.boundaryNote")}</p>
            <div className="mt-2 flex flex-col items-start">
              <a href="/start" className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">{t("talk.typeLink")} →</a>
              <a href="/whatsapp" className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">{t("begin.waLink")} →</a>
              <a href="/report" className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">{t("begin.formLink")} →</a>
            </div>
          </details>
        </div>
      </main>
    </>
  );
}
