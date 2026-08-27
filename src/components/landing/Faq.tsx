"use client";

import { useT } from "@/lib/i18n/context";

const ITEMS = [
  ["faq.q1", "faq.a1"],
  ["faq.q2", "faq.a2"],
  ["faq.q3", "faq.a3"],
  ["faq.q4", "faq.a4"],
  ["faq.q5", "faq.a5"],
  ["faq.q6", "faq.a6"],
] as const;

export function Faq() {
  const t = useT();

  return (
    <section id="faq" className="border-t border-rule">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-18 sm:py-24">
        <div className="grid lg:grid-cols-[22rem_minmax(0,1fr)] gap-x-16 gap-y-8">
          <div>
            <p className="label">{t("faq.kicker")}</p>
            <h2 className="mt-3 text-4xl sm:text-5xl">{t("faq.h2")}</h2>
          </div>

          <div className="border-t border-rule-strong">
            {ITEMS.map(([q, a]) => (
              <details key={q} className="group border-b border-rule">
                <summary className="flex items-start gap-4 py-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="flex-1 text-lg leading-snug">{t(q)}</span>
                  <span
                    className="shrink-0 mt-1 text-ink-3 transition-transform duration-200 group-open:rotate-45"
                    aria-hidden
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </summary>
                <p className="pb-6 pe-8 text-[0.9375rem] leading-[1.7] text-ink-2">{t(a)}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
