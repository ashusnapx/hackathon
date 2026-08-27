"use client";

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

export function Problem() {
  const t = useT();

  return (
    <section id="problem" className="border-t border-rule bg-sunk">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-18 sm:py-24">
        <p className="label">{t("problem.kicker")}</p>
        <h2 className="mt-3 max-w-3xl text-4xl sm:text-5xl">{t("problem.h2")}</h2>
        <p className="mt-6 max-w-2xl text-[1.0625rem] leading-[1.7] text-ink-2">{t("problem.body")}</p>

        {/* Numbers set as a ruled ledger row, not four floating cards. */}
        <dl className="mt-14 grid grid-cols-2 lg:grid-cols-4 border-t border-rule-strong">
          {STATS.map(([v, l]) => (
            <div key={v} className="border-b border-e border-rule px-4 py-6 last:border-e-0 lg:last:border-e-0 [&:nth-child(2)]:border-e-0 lg:[&:nth-child(2)]:border-e">
              <dt className="num text-3xl sm:text-[2.5rem] leading-none font-medium tracking-tight">{t(v)}</dt>
              <dd className="mt-3 text-sm leading-snug text-ink-2 max-w-[16ch]">{t(l)}</dd>
            </div>
          ))}
        </dl>

        <p className="label mt-16">{t("problem.quotesTitle")}</p>
        <div className="mt-6 grid md:grid-cols-2 gap-x-10 gap-y-8">
          {QUOTES.map(([q, a]) => (
            <figure key={q} className="border-s-2 border-rule-strong ps-5">
              <blockquote className="text-[1.0625rem] leading-[1.6] text-ink">{t(q)}</blockquote>
              <figcaption className="mt-3 text-sm text-ink-3">{t(a)}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
