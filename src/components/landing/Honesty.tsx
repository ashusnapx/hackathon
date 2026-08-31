"use client";

import { useT } from "@/lib/i18n/context";

const REAL = ["honesty.r1", "honesty.r2", "honesty.r3", "honesty.r4", "honesty.r5", "honesty.r6"] as const;
const MOCK = ["honesty.m1", "honesty.m2", "honesty.m3", "honesty.m4", "honesty.m5"] as const;

/**
 * Disclosed on the marketing page rather than buried in a README. A tool that
 * asks fraud victims to trust it does not get to be coy about what it fakes.
 */
export function Honesty() {
  const t = useT();

  return (
    <section id="honesty" className="border-t border-rule bg-sunk">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-18 sm:py-24">
        <p className="label">{t("honesty.kicker")}</p>
        <h2 className="mt-3 max-w-2xl text-4xl sm:text-5xl">{t("honesty.h2")}</h2>
        <p className="mt-6 max-w-2xl text-[1.0625rem] leading-[1.7] text-ink-2 font-light">{t("honesty.body")}</p>

        <div className="mt-12 grid md:grid-cols-2 gap-px bg-rule border border-rule">
          <div className="bg-paper p-6 sm:p-8">
            <h3 className="flex items-center gap-2.5 text-lg em-done !font-semibold">
              <Tick />
              {t("honesty.realTitle")}
            </h3>
            <ul className="mt-5 space-y-3">
              {REAL.map((k) => (
                <li key={k} className="flex gap-3 text-[0.9375rem] leading-snug font-medium">
                  <span className="text-done mt-0.5 shrink-0 font-bold" aria-hidden>✓</span>
                  <span>{t(k)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-paper p-6 sm:p-8">
            <h3 className="flex items-center gap-2.5 text-lg">
              <Dot />
              {t("honesty.mockTitle")}
            </h3>
            <ul className="mt-5 space-y-3">
              {MOCK.map((k) => (
                <li key={k} className="flex gap-3 text-[0.9375rem] leading-snug text-ink-2 font-light">
                  <span className="text-ink-3 mt-0.5 shrink-0" aria-hidden>◦</span>
                  <span>{t(k)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 max-w-3xl border-s-2 border-urgent ps-5 sm:ps-6">
          <h3 className="text-lg quiet-em">{t("honesty.scaleTitle")}</h3>
          <p className="mt-3 text-[0.9375rem] leading-[1.7] text-ink-2 font-light">{t("honesty.scale")}</p>
        </div>
      </div>
    </section>
  );
}

function Tick() {
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-done-soft text-done text-xs" aria-hidden>
      ✓
    </span>
  );
}

function Dot() {
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-rule-strong text-ink-3 text-xs" aria-hidden>
      ◦
    </span>
  );
}
