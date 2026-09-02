"use client";

import { Headline } from "@/components/ui/Split";
import { useT } from "@/lib/i18n/context";

const STATS = [
  ["problem.stat1.v", "problem.stat1.l"],
  ["problem.stat2.v", "problem.stat2.l"],
  ["problem.stat3.v", "problem.stat3.l"],
  ["problem.stat4.v", "problem.stat4.l"],
] as const;

const QUOTES = [
  ["problem.q1", "problem.q1a"],
  ["problem.q2", "problem.q2a"],
  ["problem.q3", "problem.q3a"],
  ["problem.q4", "problem.q4a"],
] as const;

/**
 * The first coloured slab: deep green, full bleed, corners cut on all four
 * sides so the cream shows through around it.
 *
 * The reference reserves this treatment for its single strongest claim — "4x
 * faster than typing", set in Garamond at ninety-six pixels against the same
 * green. The equivalent claim here is the size of the problem, so the four
 * numbers get the display face and the paragraph gets out of their way.
 *
 * `.on-deep` redefines ink, rule and the four semantic colours for the panel,
 * so nothing inside needs to know it is on a dark ground.
 */
export function Problem() {
  const t = useT();

  return (
    <section id="problem" className="on-deep panel-full overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-28">
        <p className="label">{t("problem.kicker")}</p>

        <h2 className="mt-4 max-w-[16ch]">
          <Headline>{t("problem.h2")}</Headline>
        </h2>

        <p
          className="mt-8 max-w-[58ch] text-[1.0625rem] sm:text-lg leading-[1.6] text-ink-2"
          data-reveal
          style={{ "--i": 1 } as React.CSSProperties}
        >
          {t("problem.body")}
        </p>

        {/* Four figures in the display face. On a dark ground a mono numeral at
            this size looks like a readout; Garamond looks like a statement. */}
        <dl
          className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-px bg-rule border border-rule rounded-card overflow-hidden"
          data-reveal
          style={{ "--i": 2 } as React.CSSProperties}
        >
          {STATS.map(([v, l]) => (
            <div key={v} className="bg-[color:var(--deep)] px-5 py-7 sm:px-6 sm:py-9">
              <dt className="figure text-[2.5rem] sm:text-[3.25rem] text-ink">{t(v)}</dt>
              <dd className="mt-4 text-sm leading-snug text-ink-2 max-w-[18ch]">{t(l)}</dd>
            </div>
          ))}
        </dl>

        <p className="label mt-20">{t("problem.quotesTitle")}</p>
        <div className="mt-7 grid md:grid-cols-2 gap-4">
          {QUOTES.map(([q, a], i) => (
            <figure
              key={q}
              className="lift rounded-card border border-rule bg-raised p-6 sm:p-7"
              data-reveal
              style={{ "--i": i } as React.CSSProperties}
            >
              <blockquote className="quiet-em text-[1.375rem] sm:text-[1.5rem] leading-[1.28] text-ink">
                {t(q)}
              </blockquote>
              <figcaption className="mt-5 text-sm text-ink-3">{t(a)}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
