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
      <section className="mx-auto max-w-6xl px-4 sm:px-8 pt-8 sm:pt-10">
        <p className="label">{t("wa.eyebrow")}</p>
        <h1 className="h1-long mt-3">{t("wa.title")}</h1>
        <p className="mt-5 max-w-2xl text-[1.0625rem] leading-[1.65] text-ink-2">{t("wa.sub")}</p>
        <div className="mt-5 rounded-card border border-wait/40 bg-wait-soft px-4 py-3">
          <p className="text-sm leading-[1.6] text-ink-2">{t("wa.notReal")}</p>
        </div>
        <ul className="mt-6 grid gap-3 sm:grid-cols-3">
          {(["wa.point1", "wa.point2", "wa.point3"] as const).map((key) => (
            <li key={key} className="sheet px-4 py-3.5 text-sm leading-[1.55] text-ink-2">{t(key)}</li>
          ))}
        </ul>
      </section>
      <GuidedIntake lockChannel="whatsapp" />
    </>
  );
}
