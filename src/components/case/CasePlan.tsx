"use client";

import { liveTracks, type LiveTrack } from "@/lib/case/tracks";
import { useT } from "@/lib/i18n/context";
import { cn, fmtDate } from "@/lib/utils";
import type { CaseFile } from "@/lib/case/types";

/**
 * The case as a sequence rather than a noticeboard.
 *
 * The overview was ten self-contained cards stacked in the order they happened
 * to be written: a clock, a next action, an evidence percentage, a completeness
 * percentage, an escalation guide, an aftercare note, a sharing panel. Nine
 * hundred words and six screens of it, each card competing to be read first,
 * and none of them saying what to do after the one above.
 *
 * Somebody who has just been defrauded is not browsing. They want to know what
 * to do now, what comes after it, and what is going to bite them if they wait.
 * So the page is a plan: phases in the order they happen, with everything that
 * is reference material folded until it is needed.
 */

/** One phase of the plan: a heading, and what belongs under it. */
export function CasePlanPhase({ n, title, note, children }: {
  n: number;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7 first:mt-0">
      <div className="flex items-baseline gap-2.5">
        <span
          className="num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-deep text-[0.6875rem] font-semibold text-[#ffffeb]"
          aria-hidden
        >
          {n}
        </span>
        <h2 className="!font-sans !text-[1.0625rem] !font-semibold !tracking-normal !leading-snug">
          {title}
        </h2>
      </div>
      {note && <p className="mt-1.5 ms-8.5 text-sm leading-[1.55] text-ink-3">{note}</p>}
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  );
}

/**
 * What comes after the thing they are doing now.
 *
 * Not the full ten tracks — that is a tab of its own, and putting all of it
 * here is how the page became a wall. Three, in the order they fall due, so
 * that "what happens next" is answered on the page rather than found on it.
 */
export function NextSteps({ caseFile, onOpen }: { caseFile: CaseFile; onOpen: () => void }) {
  const t = useT();
  const live = liveTracks(caseFile);
  const pending = live
    .filter((track) => track.state === "due" || track.state === "upcoming")
    .slice(1, 4);
  const done = live.filter((track) => track.state === "done").length;

  if (!pending.length) return null;

  return (
    <div className="sheet px-4 py-4 sm:px-5">
      <ol className="divide-y divide-rule">
        {pending.map((track) => (
          <Step key={track.def.id} track={track} label={t(track.def.titleKey)} />
        ))}
      </ol>
      <button
        type="button"
        onClick={onOpen}
        className="mt-3 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4"
      >
        {t("plan.allSteps")}
        {done > 0 && <span className="ms-1.5 text-ink-3">· {done} {t("plan.done")}</span>}
      </button>
    </div>
  );
}

function Step({ track, label }: { track: LiveTrack; label: string }) {
  const t = useT();
  const overdue = track.msLeft !== null && track.msLeft < 0;
  return (
    <li className="flex items-baseline justify-between gap-4 py-2.5">
      <span className="min-w-0 text-[0.9375rem] leading-snug">{label}</span>
      <span
        className={cn(
          "shrink-0 text-xs",
          overdue ? "text-urgent-ink" : track.state === "due" ? "text-ink-2" : "text-ink-3",
        )}
      >
        {track.deadline
          ? `${t(track.dateKind === "opens" ? "plan.opens" : "plan.by")} ${fmtDate(track.deadline.toISOString())}`
          : t("plan.whenReady")}
      </span>
    </li>
  );
}

/**
 * Reference material, closed.
 *
 * Escalation routes and aftercare are real and worth having — and neither is
 * anything to read in the first hour. Open, they were four of the six screens.
 */
export function Folded({ title, note, children }: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="sheet px-4 py-3 sm:px-5">
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
        <span className="text-[0.9375rem] font-medium">{title}</span>
        <span className="shrink-0 text-xs text-ink-3">{note}</span>
      </summary>
      <div className="mt-3 space-y-4">{children}</div>
    </details>
  );
}
