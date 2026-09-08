"use client";

import { Chapter } from "@/components/landing/Chapter";
import { LANGUAGES, SCRIPT_CLASS } from "@/lib/i18n/languages";
import { useT } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dict/en";

/**
 * Chapter three: the four decisions that are hard to bolt on afterwards.
 *
 * ── Why this is a moat chapter and not a features chapter ───────────────────
 *
 * The page used to have three sections making overlapping product claims —
 * a feature grid, a language specimen, a deadline explainer — none of which
 * said why any of it would be difficult for somebody else to do next quarter.
 * A list of features invites the reader to imagine the incumbent adding them.
 *
 * These four do not. Each one had to be settled before the first line of the
 * intake was written, which is the actual claim: twenty-three languages that
 * reach the extraction and the drafts is a different intake, not a dropdown;
 * a deadline that can name its rule means provenance was carried from the start
 * or it was never carried; a system that takes speech in any order cannot be
 * a sixteen-field form with a microphone added; and a product that has never
 * once implied something was filed has an asset that cannot be acquired late.
 *
 * The fourth has an em dash where the others have a number, deliberately. It is
 * the count of things we pretend are filed, and the only honest figure for it
 * is nothing at all — which reads harder than a zero would.
 *
 * The language strip closes the chapter rather than opening a chapter of its
 * own. Writing "Tamil" in Latin type proves nothing; setting தமிழ் proves the
 * whole font pipeline works, and it does it in one band instead of a section.
 */

interface Claim {
  n: DictKey;
  t: DictKey;
  b: DictKey;
}

const CLAIMS: Claim[] = [
  { n: "ch.moat.m1n", t: "ch.moat.m1t", b: "ch.moat.m1b" },
  { n: "ch.moat.m2n", t: "ch.moat.m2t", b: "ch.moat.m2b" },
  { n: "ch.moat.m3n", t: "ch.moat.m3t", b: "ch.moat.m3b" },
  { n: "ch.moat.m4n", t: "ch.moat.m4t", b: "ch.moat.m4b" },
];

export function Moat() {
  const t = useT();

  return (
    <Chapter id="features" n="03" kicker="ch.moat.k" heading="ch.moat.h" lede="ch.moat.b">
      <ol className="grid sm:grid-cols-2 gap-px bg-rule border border-rule rounded-card overflow-hidden" data-reveal>
        {CLAIMS.map((c) => (
          <li
            key={c.t}
            className="bg-paper p-7 sm:p-9"
          >
            <p className="figure text-[3rem] sm:text-[3.75rem] leading-[0.9] text-[color:var(--urgent-ink)]">
              {t(c.n)}
            </p>
            <h3 className="mt-5 text-[1.375rem] leading-[1.15] max-w-[18ch]">{t(c.t)}</h3>
            <p className="mt-3 max-w-[42ch] text-[0.9375rem] leading-[1.55] text-ink-2">{t(c.b)}</p>
          </li>
        ))}
      </ol>

      {/* The specimen sheet, as a band. Two identical copies translated by
          exactly one copy's width, so the loop has no seam; the second is
          hidden from assistive technology and the first is a real list a screen
          reader can read straight through. */}
      <div className="mt-14 border-y border-rule py-6">
        {/* dir is pinned: the strip mixes Devanagari, Tamil and Urdu, and a
            right-to-left page would otherwise reverse the whole band. */}
        <div className="marquee" dir="ltr" style={{ "--marquee-dur": "64s" } as React.CSSProperties}>
          {[false, true].map((hidden) => (
            <ul
              key={String(hidden)}
              className="flex items-center gap-8 sm:gap-11 pe-8 sm:pe-11"
              {...(hidden ? { "aria-hidden": true } : {})}
            >
              {LANGUAGES.map((l) => (
                <li key={l.code} className="flex items-center gap-8 sm:gap-11 shrink-0">
                  {/* No `leading-none`. An Indic line box has to hold matras
                      above the cap line and vowel signs below the baseline; a
                      1em box slices both off. */}
                  <span
                    dir={l.dir}
                    className={`text-xl sm:text-2xl leading-[1.65] py-1 text-ink-2 ${SCRIPT_CLASS[l.script]}`}
                  >
                    {l.endonym}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-ink/25 shrink-0" aria-hidden />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>

      <p className="mt-5 text-[0.8125rem] text-ink-3">{t("ticker.note")}</p>
    </Chapter>
  );
}
