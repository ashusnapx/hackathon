"use client";

import { Button } from "@/components/ui/Button";
import { Split, countWords } from "@/components/ui/Split";
import { useT } from "@/lib/i18n/context";

/**
 * The hero, composed the way the reference composes its own: a small tracked
 * eyebrow, two lines of very large Garamond with the second line leaning into
 * italic, a short sans lede, one button, one caption.
 *
 * The copy already had the right shape for it — "You have sixty minutes." /
 * "We know exactly what to do with them." is the same two-beat turn as "Don't
 * type, just speak." The italic falls on the second beat in both.
 *
 * Centred, which the rest of this site is not. It earns it here because there
 * is exactly one thing to read and one thing to do; every section below goes
 * back to an asymmetric grid.
 */
export function Hero() {
  const t = useT();
  const line1 = t("hero.h1a");
  const line2 = t("hero.h1b");

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 ledger pointer-events-none" aria-hidden />

      <div className="relative mx-auto max-w-5xl px-5 sm:px-8 pt-8 pb-16 sm:pt-12 sm:pb-24 text-center">
        {/* The emergency line sits above the headline, because for some readers
            arriving here it is the only thing on the page that matters. */}
        <a
          href="tel:1930"
          className="press inline-flex items-center gap-2.5 rounded-ctl border border-ink/25 bg-urgent-soft px-3.5 py-2 text-[0.9375rem] hover:border-ink transition-colors rise"
        >
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full rounded-full bg-urgent opacity-70 pulse-ring" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-urgent" />
          </span>
          <span className="font-medium">{t("sos.title")}</span>
          <span className="num font-bold tracking-tight underline underline-offset-2">1930</span>
        </a>

        <p className="label mt-8 rise" style={{ animationDelay: "60ms" }}>
          {t("hero.eyebrow")}
        </p>

        <h1 className="h1-long mt-6 mx-auto max-w-[24ch]">
          <Split>{line1}</Split>{" "}
          <Split className="quiet-em" from={countWords(line1)}>
            {line2}
          </Split>
        </h1>

        <p
          className="mt-8 mx-auto max-w-[46ch] text-[1.0625rem] sm:text-xl leading-[1.45] text-ink-2 rise"
          style={{ animationDelay: "240ms" }}
        >
          {t("hero.sub")}
        </p>

        <div
          className="mt-9 flex flex-col sm:flex-row gap-3 justify-center rise"
          style={{ animationDelay: "300ms" }}
        >
          <Button href="/assist" size="lg" className="press">
            {t("hero.cta")}
            <Arrow />
          </Button>
          <Button href="/check" size="lg" variant="secondary" className="press">
            {t("hero.cta3")}
          </Button>
        </div>

        <p className="mt-5 text-sm text-ink-3 rise" style={{ animationDelay: "340ms" }}>
          {t("hero.notOfficial")}
        </p>

        {/* Three claims on one rule, the way the reference sets the line of
            small print under its download button. */}
        {/* The reveal sits on the list, not on each row. These grids paint their
            own gaps with the rule colour, so hiding the children individually
            leaves a solid slab of rule on screen until the first one arrives. */}
        <ul
          className="mt-14 grid sm:grid-cols-3 gap-px bg-rule border-y border-rule text-start"
          data-reveal
        >
          {(["hero.point1", "hero.point2", "hero.point3"] as const).map((k, i) => (
            <li key={k} className="bg-paper px-5 py-5 flex gap-3.5 items-baseline">
              <span className="num text-xs text-urgent-ink font-bold shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[0.9375rem] leading-snug">{t(k)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Arrow() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="rtl:rotate-180">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
