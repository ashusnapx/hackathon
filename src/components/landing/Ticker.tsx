"use client";

import { LANGUAGES, SCRIPT_CLASS } from "@/lib/i18n/languages";
import { useT } from "@/lib/i18n/context";

/**
 * The band that runs under the hero.
 *
 * The reference puts a scrolling row of customer logos here — Microsoft,
 * Amazon, Notion — as the proof that follows the promise. There is no honest
 * equivalent of that for a hackathon submission: no customers, no logos, and
 * borrowing a government emblem to imply endorsement is exactly what the brief
 * forbids.
 *
 * So the slot carries the one claim that can prove itself on sight. Twenty-three
 * languages, each set in its own script at a size where the letterforms are
 * legible. Writing "Tamil" in Latin type proves nothing; தமிழ் rendering
 * correctly proves the whole font pipeline works, and it does it before the
 * reader has scrolled.
 *
 * Two identical copies translated by exactly one copy's width, so the loop has
 * no seam. The second is hidden from assistive technology; the first is a real
 * list a screen reader can read straight through.
 */
export function Ticker() {
  const t = useT();

  const row = (hidden: boolean) => (
    <ul
      className="flex items-center gap-8 sm:gap-11 pe-8 sm:pe-11 py-2"
      {...(hidden ? { "aria-hidden": true } : {})}
    >
      {LANGUAGES.map((l) => (
        <li key={l.code} className="flex items-center gap-8 sm:gap-11 shrink-0">
          {/* No `leading-none` here. The marquee clips on both axes, and an
              Indic line box has to hold matras above the cap line and vowel
              signs below the baseline — a 1em box slices both off. */}
          <span
            dir={l.dir}
            className={`text-2xl sm:text-[1.75rem] leading-[1.65] py-1 ${SCRIPT_CLASS[l.script]}`}
          >
            {l.endonym}
          </span>
          <span className="w-1 h-1 rounded-full bg-ink/25 shrink-0" aria-hidden />
        </li>
      ))}
    </ul>
  );

  return (
    <section aria-labelledby="ticker-label" className="border-y border-rule bg-paper py-7 sm:py-9">
      <h2 id="ticker-label" className="sr-only">
        {t("langs.count")}
      </h2>
      {/* dir is pinned: the strip mixes Devanagari, Tamil and Urdu, and a
          right-to-left page would otherwise reverse the whole band. */}
      <div className="marquee py-1" dir="ltr" style={{ "--marquee-dur": "64s" } as React.CSSProperties}>
        {row(false)}
        {row(true)}
      </div>
      <p className="mt-7 sm:mt-9 text-center text-sm text-ink-3 px-5">{t("ticker.note")}</p>
    </section>
  );
}
