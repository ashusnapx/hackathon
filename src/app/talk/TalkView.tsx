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
          <h1 className="text-2xl sm:text-3xl leading-tight">{t("talk.h")}</h1>
          <p className="mt-3 text-[1.0625rem] leading-[1.6] text-ink-2">{t("talk.sub")}</p>

          <div className="mt-6">
            <GuidedIntake lockChannel="voice" />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button href="tel:1930" external variant="urgent" size="sm">{t("begin.call1930")}</Button>
            <Button href="tel:112" external variant="secondary" size="sm">{t("begin.call112")}</Button>
          </div>

          <p className="mt-5 text-xs leading-[1.55] text-ink-3">{t("begin.boundaryNote")}</p>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2.5">
            <a href="/start" className="text-sm font-medium underline underline-offset-4">{t("talk.typeLink")} →</a>
            <a href="/whatsapp" className="text-sm font-medium underline underline-offset-4">{t("begin.waLink")} →</a>
            <a href="/report" className="text-sm font-medium underline underline-offset-4">{t("begin.formLink")} →</a>
          </div>
        </div>
      </main>
    </>
  );
}
