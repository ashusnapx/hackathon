"use client";

import { useMemo } from "react";
import { Headline } from "@/components/ui/Split";
import { TRACKS, scheduleFrom } from "@/lib/case/tracks";
import { useI18n } from "@/lib/i18n/context";
import { useIsClient } from "@/lib/useIsClient";
import { cn } from "@/lib/utils";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

/** Which clocks are already ticking the moment the fraud happens. */
const RUNS_IMMEDIATELY = new Set(["helpline", "ncrp", "bank-notice", "fir", "chakshu"]);

/** Below this, a deadline is an hour of a day rather than a day. */
const HOURS_48 = 48 * 60 * 60 * 1000;

/**
 * The centrepiece of the argument, as a dated schedule.
 *
 * It used to print the rule for each deadline — "ten working days after you
 * notified" — which is accurate and does nothing. A reader cannot check a rule
 * against their own calendar. So the section now reads the clock in the
 * reader's browser and runs the app's real deadline functions against it, and
 * every clock that has a date shows the date.
 *
 * Three honesty constraints shape how that is done:
 *
 *   · The dates are computed on the client only. A server-rendered "now" would
 *     be the server's clock in the server's timezone, and would mismatch on
 *     hydration. Until the client renders, each row shows the rule it always
 *     showed, so the section is complete and correct without JavaScript.
 *   · Four of the ten have no statutory deadline. They are not given invented
 *     dates; they say so.
 *   · Three of them start from the day the citizen writes to their bank, not
 *     from the fraud. That assumption is stated under the list rather than
 *     buried in a tooltip.
 *
 * The numerals are set in the display face rather than the mono. A monospaced
 * "VII" reads as a table cell; a Garamond one reads as a clause in a statute,
 * which is what a limitation period actually is.
 */
export function Clocks() {
  const { t, lang } = useI18n();
  const isClient = useIsClient();

  const clock = useMemo(() => {
    if (!isClient) return null;
    const at = new Date();
    return { at, schedule: scheduleFrom(at) };
  }, [isClient]);
  const schedule = clock?.schedule ?? null;

  const fmt = useMemo(() => {
    // An Eighth Schedule code with no CLDR data resolves to the runtime's
    // fallback rather than throwing, but a malformed one would throw, and a
    // date formatter is not worth a blank section over.
    const make = (opts: Intl.DateTimeFormatOptions) => {
      try {
        return new Intl.DateTimeFormat(`${lang.code}-IN`, opts);
      } catch {
        return new Intl.DateTimeFormat("en-IN", opts);
      }
    };
    return {
      day: make({ weekday: "short", day: "numeric", month: "short" }),
      time: make({ hour: "numeric", minute: "2-digit" }),
    };
  }, [lang.code]);

  return (
    <section id="clocks" className="bg-paper">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-28">
        <div className="grid lg:grid-cols-[21rem_minmax(0,1fr)] gap-x-16 gap-y-12">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <h2>
              <Headline>{t("clocks.h2")}</Headline>
            </h2>
            <p
              className="mt-7 text-[1.0625rem] leading-[1.55] text-ink-2"
              data-reveal
              style={{ "--i": 1 } as React.CSSProperties}
            >
              {t("clocks.lede")}
            </p>

            <div
              className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm"
              data-reveal
              style={{ "--i": 2 } as React.CSSProperties}
            >
              <span className="inline-flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-urgent" aria-hidden />
                <span className="text-ink-2">{t("clocks.legend.live")}</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full border border-rule-strong" aria-hidden />
                <span className="text-ink-2">{t("clocks.legend.soon")}</span>
              </span>
            </div>
          </div>

          <div>
            {schedule && (
              <p className="label mb-4" aria-hidden>
                {t("clocks.today")}
              </p>
            )}

            <ol className="border-t border-rule-strong">
              {TRACKS.map((track, i) => {
                const live = RUNS_IMMEDIATELY.has(track.id);
                const due = schedule?.[i]?.deadline ?? null;
                // Use the exact instant that generated the schedule. Apart
                // from satisfying render purity, this keeps every row in one
                // coherent snapshot even if rendering crosses a second.
                const soon = due && clock ? due.getTime() - clock.at.getTime() < HOURS_48 : false;

                return (
                  <li
                    key={track.id}
                    className="row-mark border-b border-rule ps-5 -ms-5 transition-colors hover:bg-ink/[0.035]"
                    data-reveal
                    style={{ "--i": i } as React.CSSProperties}
                  >
                    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 py-5">
                      <span
                        className={cn(
                          "figure text-2xl w-10 shrink-0 text-end",
                          live ? "text-urgent-ink" : "text-ink-3",
                        )}
                        aria-hidden
                      >
                        {ROMAN[i]}
                      </span>

                      <div className="min-w-0 flex-1 basis-56">
                        <h3 className="text-xl sm:text-[1.5rem] leading-tight">{t(track.titleKey)}</h3>
                        {/* Once the row carries a date, the rule that produced
                            it moves underneath, where it explains rather than
                            competes. Before that it is all there is, so it
                            stays in the chip. */}
                        {schedule && (
                          <p className="mt-1.5 text-sm text-ink-3">{t(track.dueKey)}</p>
                        )}
                      </div>

                      <span
                        className={cn(
                          "chip px-2.5 py-1.5 rounded-ctl max-w-full ms-auto border whitespace-nowrap",
                          live
                            ? "bg-urgent-soft text-urgent-ink border-urgent/40"
                            : due
                              ? "bg-transparent text-ink border-rule-strong"
                              : "bg-transparent text-ink-3 border-rule",
                        )}
                      >
                        {due ? (
                          <>
                            <time dateTime={due.toISOString()}>{fmt.day.format(due)}</time>
                            {soon && !track.workingDayEstimate && <span className="ms-1.5 opacity-70">{` ${fmt.time.format(due)}`}</span>}
                          </>
                        ) : schedule ? (
                          t("clocks.noDate")
                        ) : (
                          t(track.dueKey)
                        )}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>

            {schedule && (
              <p className="mt-6 max-w-[62ch] text-sm leading-[1.6] text-ink-3">
                {t("clocks.assume")}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
