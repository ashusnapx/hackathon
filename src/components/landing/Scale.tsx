"use client";

import { Chapter, Figure } from "@/components/landing/Chapter";
import { SCALE_SOURCE } from "@/lib/landing-sources";
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
  ["problem.q4", "problem.q4a"],
] as const;

/**
 * Chapter one: how big this is, in four numbers and three sentences.
 *
 * The reference reserves the deep green slab and Garamond at ninety-six pixels
 * for its single strongest claim. The strongest claim on this page is a
 * quantity, so the quantities take the face and the prose gets out of the way —
 * four figures, a line of provenance, and then three people saying what the
 * number felt like from inside it.
 *
 * The source line is not a footnote and is not in small grey type at the bottom.
 * It sits directly under the numbers, because a page that spends its length
 * arguing that claims should carry their sources cannot make its own biggest
 * claim and then decline to say where it came from.
 *
 * Three quotes, not the four this section used to run. The fourth said the same
 * thing as the second in different words, and a wall of grievance stops being
 * evidence and starts being a mood.
 */
export function Scale() {
  const t = useT();

  return (
    <Chapter id="scale" n="01" kicker="ch.scale.k" heading="ch.scale.h" lede="ch.scale.b" ground="on-deep">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-x-8 gap-y-12">
        {STATS.map(([v, l], i) => (
          <div key={v} data-reveal style={{ "--i": i } as React.CSSProperties}>
            <Figure v={t(v)} l={t(l)} />
          </div>
        ))}
      </div>

      {/* The citation is a link, not a sentence.
          Two of the four numbers that used to sit above this line could not be
          traced to anything when somebody finally checked them — on the page
          that spends its length arguing a claim should carry its source. It now
          points at the primary document rather than at a write-up of one, and
          `scripts/check-sources.mjs` watches it every Monday alongside the RBI
          and BNSS citations. */}
      <div className="mt-14 max-w-[62ch] border-t border-rule pt-5">
        <p className="text-[0.8125rem] leading-[1.5] text-ink-3">{t("problem.statSrc")}</p>
        <a
          href={SCALE_SOURCE.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium underline decoration-rule-strong underline-offset-[3px] hover:decoration-current"
        >
          {t("problem.statSrcCta")}: {SCALE_SOURCE.label}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="rtl:-scale-x-100">
            <path d="M7 17L17 7M9 7h8v8" />
          </svg>
        </a>
      </div>

      {/* What the number felt like from inside it. */}
      <ul className="mt-14 grid md:grid-cols-3 gap-px bg-rule border-y border-rule" data-reveal>
        {QUOTES.map(([q, a]) => (
          <li
            key={q}
            className="bg-[color:var(--paper)] p-6 sm:p-7"
          >
            <blockquote className="quiet-em text-[1.125rem] leading-[1.3] text-ink">{t(q)}</blockquote>
            <p className="mt-4 text-xs text-ink-3">{t(a)}</p>
          </li>
        ))}
      </ul>
    </Chapter>
  );
}
