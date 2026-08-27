"use client";

import { TRACKS } from "@/lib/case/tracks";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

/** Which clocks are already ticking the moment the fraud happens. */
const RUNS_IMMEDIATELY = new Set(["helpline", "ncrp", "bank-notice", "fir", "chakshu"]);

/**
 * The centrepiece of the argument. Laid out as a numbered schedule — the form of
 * a legal annexure — because the point being made is that this is a list of
 * obligations, and that a citizen was only ever handed one of them.
 */
export function Clocks() {
  const t = useT();

  return (
    <section id="clocks" className="border-t border-rule">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-18 sm:py-24">
        <div className="grid lg:grid-cols-[22rem_minmax(0,1fr)] gap-x-16 gap-y-10">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="label">{t("clocks.kicker")}</p>
            <h2 className="mt-3 text-4xl sm:text-5xl">{t("clocks.h2")}</h2>
            <p className="mt-6 text-[1.0625rem] leading-[1.7] text-ink-2">{t("clocks.body")}</p>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-urgent" aria-hidden />
                <span className="text-ink-2">{t("clocks.legend.live")}</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full border border-rule-strong" aria-hidden />
                <span className="text-ink-2">{t("clocks.legend.soon")}</span>
              </span>
            </div>
          </div>

          <ol className="border-t border-rule-strong">
            {TRACKS.map((track, i) => {
              const live = RUNS_IMMEDIATELY.has(track.id);
              return (
                <li key={track.id} className="group border-b border-rule">
                  <div className="flex items-start gap-4 sm:gap-6 py-5">
                    <span
                      className={cn(
                        "num text-sm w-8 shrink-0 pt-1 text-end",
                        live ? "text-urgent" : "text-ink-3",
                      )}
                      aria-hidden
                    >
                      {ROMAN[i]}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h3 className="text-lg sm:text-xl leading-snug">{t(track.titleKey)}</h3>
                        <span
                          className={cn(
                            "chip px-1.5 py-0.5 rounded-[2px] shrink-0",
                            live ? "bg-urgent-soft text-urgent-ink" : "bg-sunk text-ink-3",
                          )}
                        >
                          {t(track.dueKey)}
                        </span>
                      </div>
                      <p className="mt-2 text-[0.9375rem] leading-[1.6] text-ink-2 max-w-2xl">
                        {t(track.whyKey)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <p className="mt-10 max-w-3xl text-sm leading-relaxed text-ink-3 lg:ms-[26rem]">
          {t("clocks.footnote")}
        </p>
      </div>
    </section>
  );
}
