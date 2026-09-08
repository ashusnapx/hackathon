"use client";

import { useMemo, useState } from "react";

import type { CaseFile, CaseEvent } from "@/lib/case/types";
import { useT } from "@/lib/i18n/context";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/**
 * The road, with its milestones.
 *
 * Every case already carried a full event log — opened, triaged, drafted, each
 * track ticked, each fact corrected — and nothing ever displayed it. So a person
 * three weeks in could see what was still to do and had no way to see what they
 * had already done, which is the half that answers "am I getting anywhere?".
 * It is also the half an officer or a bank asks for: not the plan, the history.
 *
 * Drawn as a kos minar rather than a progress bar. The Mughal-era pillars along
 * the Grand Trunk Road marked distance covered on a journey whose end was still
 * far off, which is exactly the shape of this: a milestone is not a percentage,
 * it is proof of ground already crossed. A percentage would also be a lie here,
 * because nobody knows how long one of these cases is.
 *
 * Newest first, because the question is almost always "what happened last?".
 */

const KIND_STYLE: Record<CaseEvent["kind"], { dot: string; ring: string }> = {
  opened: { dot: "bg-ink", ring: "ring-ink/20" },
  triaged: { dot: "bg-info", ring: "ring-info/25" },
  track: { dot: "bg-done", ring: "ring-done/25" },
  docs: { dot: "bg-wait", ring: "ring-wait/25" },
  edit: { dot: "bg-ink/40", ring: "ring-ink/12" },
};

/** Shown collapsed; the rest is one tap away. */
const PREVIEW = 6;

export function CaseTimeline({ caseFile }: { caseFile: CaseFile }) {
  const t = useT();
  const { lang } = useI18n();
  const [all, setAll] = useState(false);

  const events = useMemo(
    // A copy: `events` is the stored array and reversing in place would rewrite
    // the case's own history every time this rendered.
    () => [...caseFile.events].reverse(),
    [caseFile.events],
  );

  const fmt = useMemo(() => {
    const make = () => {
      try {
        return new Intl.DateTimeFormat(`${lang.code}-IN`, {
          day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
        });
      } catch {
        return new Intl.DateTimeFormat("en-IN", {
          day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
        });
      }
    };
    return make();
  }, [lang.code]);

  if (!events.length) return null;
  const shown = all ? events : events.slice(0, PREVIEW);

  return (
    <section className="relative overflow-hidden rounded-card border border-rule bg-raised px-5 py-5">
      {/* A pierced screen rather than a flat tint: the lattice reads as depth
          behind the milestones without competing with them for attention. */}
      <div className="jaali pointer-events-none absolute inset-0 text-ink" aria-hidden />
      <div className="relative flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-base font-semibold">{t("timeline.title")}</h2>
        <p className="num text-sm text-ink-3">
          {events.length} {t("timeline.entries")}
        </p>
      </div>
      <p className="relative mt-1 text-sm leading-[1.55] text-ink-3">{t("timeline.sub")}</p>

      <ol className="relative mt-5">
        {/* The road itself. Sits behind the pillars and stops at the last one,
            so the line never dangles past the oldest event. */}
        <span
          className="absolute start-[5px] top-2 bottom-2 w-px bg-rule"
          aria-hidden
        />
        {shown.map((event, index) => {
          const style = KIND_STYLE[event.kind] ?? KIND_STYLE.edit;
          const at = new Date(event.at);
          return (
            <li key={`${event.at}-${index}`} className="relative flex gap-4 pb-4 last:pb-0">
              <span
                className={cn(
                  // `minar` draws the marker's diamond cap; the dot beneath it
                  // carries the colour that says which kind of event this was.
                  "minar relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 bg-clip-padding",
                  style.dot,
                  style.ring,
                )}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[0.9375rem] leading-snug">{event.label}</span>
                <span className="num mt-0.5 block text-xs text-ink-3">
                  {Number.isNaN(at.getTime()) ? event.at : fmt.format(at)}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      {events.length > PREVIEW && (
        <button
          onClick={() => setAll((open) => !open)}
          className="mt-3 text-sm font-medium text-ink-2 underline underline-offset-4 hover:text-ink"
        >
          {all ? t("timeline.less") : `${t("timeline.more")} (${events.length - PREVIEW})`}
        </button>
      )}
    </section>
  );
}
