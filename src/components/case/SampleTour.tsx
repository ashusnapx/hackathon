"use client";

import { useEffect, useState } from "react";

import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/**
 * A reading order for the sample case.
 *
 * The case screen has six tabs, ten tracks, an evidence vault and seven drafts,
 * which is right for somebody working their own case over days and wrong for
 * somebody deciding in ninety seconds whether this is real. Left alone on the
 * Overview tab, a first-time reader sees a wall and leaves without finding the
 * two things that are actually unusual here: that the deadlines are computed
 * from cited conditions rather than printed as folklore, and that the whole
 * case came out of a recorded phone call.
 *
 * So this is a route through it. Five steps, each one naming what to look at
 * and moving to the tab that holds it. It is not a modal and it does not trap
 * focus or grey the page out: everything stays clickable, and somebody who
 * wants to ignore it can, which is the difference between a guide and a gate.
 *
 * It appears on the sample case only. A real case belongs to somebody in the
 * middle of a bad week and is not a place for a product tour.
 */

/**
 * The tour's own names for the screens it walks through.
 *
 * These were the tab ids. Two of them were renamed when the tabs became pages —
 * "tracks" is "steps" and "docs" is "papers" — and "overview" is now the case
 * home rather than a screen of its own, so it maps to an empty path.
 */
export type TourTab = "overview" | "tracks" | "evidence" | "call" | "docs" | "ask";

export const TOUR_DOOR: Record<TourTab, string> = {
  overview: "",
  tracks: "steps",
  evidence: "evidence",
  call: "recording",
  docs: "papers",
  ask: "ask",
};

interface Step {
  tab: TourTab;
  titleKey: `tour.s${1 | 2 | 3 | 4 | 5}t`;
  bodyKey: `tour.s${1 | 2 | 3 | 4 | 5}b`;
}

const STEPS: Step[] = [
  { tab: "call", titleKey: "tour.s1t", bodyKey: "tour.s1b" },
  { tab: "overview", titleKey: "tour.s2t", bodyKey: "tour.s2b" },
  { tab: "tracks", titleKey: "tour.s3t", bodyKey: "tour.s3b" },
  { tab: "docs", titleKey: "tour.s4t", bodyKey: "tour.s4b" },
  { tab: "evidence", titleKey: "tour.s5t", bodyKey: "tour.s5b" },
];

const DISMISSED = "kavach.sample-tour.v1";

export function SampleTour({ onGoToTab }: { onGoToTab: (tab: TourTab) => void }) {
  const t = useT();
  const [step, setStep] = useState(0);
  // Starts closed and opens after hydration if it has not been dismissed. The
  // server has no localStorage, and rendering the panel then removing it would
  // shift the whole case screen down and back on first paint.
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Deferred, like every other localStorage read in this app: setting state
    // synchronously in an effect body cascades a second render before paint.
    queueMicrotask(() => {
      try {
        setOpen(!localStorage.getItem(DISMISSED));
      } catch {
        // Private mode: show it. A tour that cannot be remembered as dismissed
        // is a smaller annoyance than one that never appears.
        setOpen(true);
      }
    });
  }, []);

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(DISMISSED, new Date().toISOString());
    } catch {
      // It will come back next time. Nothing is lost.
    }
  };

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, next));
    setStep(clamped);
    onGoToTab(STEPS[clamped].tab);
  };

  if (!open) {
    return (
      <div className="mb-6 no-print">
        <button
          onClick={() => { setOpen(true); setStep(0); onGoToTab(STEPS[0].tab); }}
          className="text-sm font-medium text-ink-2 underline underline-offset-4 hover:text-ink"
        >
          {t("tour.reopen")}
        </button>
      </div>
    );
  }

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <aside
      className="mb-6 sheet border-info/30 bg-info-soft px-4 py-4 no-print"
      aria-label={t("tour.title")}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="label text-info">{t("tour.title")}</p>
        <p className="num text-[0.6875rem] uppercase tracking-wider text-ink-3">
          {step + 1} / {STEPS.length}
        </p>
      </div>

      <p className="mt-2 text-[1.0625rem] font-semibold leading-snug">{t(current.titleKey)}</p>
      <p className="mt-1.5 text-[0.9375rem] leading-[1.6] text-ink-2">{t(current.bodyKey)}</p>

      {/* Progress as five taps, not a bar: a reader who wants the drafts should
          be able to jump straight to them without stepping through the call. */}
      <ol className="mt-4 flex gap-1.5" aria-label={t("tour.title")}>
        {STEPS.map((s, i) => (
          <li key={s.titleKey} className="flex-1">
            <button
              onClick={() => go(i)}
              aria-current={i === step ? "step" : undefined}
              aria-label={t(s.titleKey)}
              className={cn(
                "h-1.5 w-full rounded-full transition-colors",
                i === step ? "bg-info" : i < step ? "bg-info/45" : "bg-ink/12 hover:bg-ink/25",
              )}
            />
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          onClick={() => (last ? close() : go(step + 1))}
          className="inline-flex h-11 items-center rounded-ctl border border-ink bg-ink px-4 text-[0.9375rem] font-semibold text-paper"
        >
          {t(last ? "tour.done" : "tour.next")}
        </button>
        {step > 0 && (
          <button
            onClick={() => go(step - 1)}
            className="inline-flex min-h-11 items-center text-sm text-ink-2 underline underline-offset-4 hover:text-ink"
          >
            {t("tour.back")}
          </button>
        )}
        <button
          onClick={close}
          className="ms-auto inline-flex min-h-11 items-center text-sm text-ink-3 underline underline-offset-4 hover:text-ink"
        >
          {t("tour.skip")}
        </button>
      </div>
    </aside>
  );
}
