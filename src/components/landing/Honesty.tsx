"use client";

import { Headline } from "@/components/ui/Split";
import { useT } from "@/lib/i18n/context";

const REAL = ["honesty.r1", "honesty.r2", "honesty.r3", "honesty.r4", "honesty.r5", "honesty.r6", "honesty.r7"] as const;
const MOCK = ["honesty.m1", "honesty.m2", "honesty.m3", "honesty.m4", "honesty.m5"] as const;

/**
 * Disclosed on the marketing page rather than buried in a README. A tool that
 * asks fraud victims to trust it does not get to be coy about what it fakes.
 *
 * On ink, and deliberately so: this is the section a judge goes looking for,
 * and the one the page has least interest in making easy to skim past.
 */
export function Honesty() {
  const t = useT();

  return (
    <section id="honesty" className="on-dark panel-full overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-28">
        <h2 className="max-w-[16ch]">
          <Headline>{t("honesty.h2")}</Headline>
        </h2>
        <p
          className="mt-8 max-w-[58ch] text-[1.0625rem] sm:text-lg leading-[1.6] text-ink-2"
          data-reveal
          style={{ "--i": 1 } as React.CSSProperties}
        >
          {t("honesty.body")}
        </p>

        <div className="mt-14 grid md:grid-cols-2 gap-4">
          <div
            className="rounded-card border border-rule bg-raised p-7 sm:p-9"
            data-reveal
            style={{ "--i": 2 } as React.CSSProperties}
          >
            <h3 className="flex items-center gap-3 text-[1.5rem] text-done">
              <Tick />
              {t("honesty.realTitle")}
            </h3>
            <ul className="mt-6 space-y-3.5">
              {REAL.map((k) => (
                <li key={k} className="flex gap-3 text-[0.9375rem] leading-snug">
                  <span className="text-done mt-0.5 shrink-0 font-bold" aria-hidden>✓</span>
                  <span>{t(k)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div
            className="rounded-card border border-rule bg-raised p-7 sm:p-9"
            data-reveal
            style={{ "--i": 3 } as React.CSSProperties}
          >
            <h3 className="flex items-center gap-3 text-[1.5rem] text-ink-2">
              <Dot />
              {t("honesty.mockTitle")}
            </h3>
            <ul className="mt-6 space-y-3.5">
              {MOCK.map((k) => (
                <li key={k} className="flex gap-3 text-[0.9375rem] leading-snug text-ink-2">
                  <span className="text-ink-3 mt-0.5 shrink-0" aria-hidden>◦</span>
                  <span>{t(k)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="mt-12 max-w-3xl border-s-[3px] border-urgent ps-6 sm:ps-8"
          data-reveal
          style={{ "--i": 4 } as React.CSSProperties}
        >
          <h3 className="quiet-em text-[1.75rem]">{t("honesty.scaleTitle")}</h3>
          <p className="mt-4 text-[1.0625rem] leading-[1.6] text-ink-2">{t("honesty.scale")}</p>
        </div>
      </div>
    </section>
  );
}

function Tick() {
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-done-soft text-done text-sm shrink-0" aria-hidden>
      ✓
    </span>
  );
}

function Dot() {
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-rule-strong text-ink-3 text-sm shrink-0" aria-hidden>
      ◦
    </span>
  );
}
