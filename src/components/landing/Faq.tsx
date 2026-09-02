"use client";

import { Headline } from "@/components/ui/Split";
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
    <section id="faq" className="bg-paper">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-28">
        <div className="grid lg:grid-cols-[26rem_minmax(0,1fr)] gap-x-14 gap-y-10">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <p className="label">{t("faq.kicker")}</p>
            <h2 className="mt-4">
              <Headline>{t("faq.h2")}</Headline>
            </h2>
          </div>

          <div className="border-t border-rule-strong">
            {ITEMS.map(([q, a], i) => (
              <details
                key={q}
                className="group border-b border-rule"
                data-reveal
                style={{ "--i": i } as React.CSSProperties}
              >
                <summary className="flex items-start gap-5 py-6 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="flex-1 text-[1.375rem] sm:text-[1.5rem] font-[family-name:var(--font-display)] tracking-[-0.02em] leading-[1.12]">
                    {t(q)}
                  </span>
                  <span
                    className="shrink-0 mt-1.5 grid place-items-center w-8 h-8 rounded-full border border-rule-strong text-ink-2 transition-transform duration-300 group-open:rotate-45"
                    aria-hidden
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </summary>
                <p className="pb-7 pe-12 max-w-[62ch] text-[1.0625rem] leading-[1.6] text-ink-2">{t(a)}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
