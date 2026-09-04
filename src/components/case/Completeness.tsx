"use client";

import { completeness } from "@/lib/case/tracks";
import { useT } from "@/lib/i18n/context";
import type { CaseFile } from "@/lib/case/types";
import { cn } from "@/lib/utils";

/**
 * Framed as case strength rather than "profile completion". The citizen is not
 * filling in a form for us — they are assembling something an investigating
 * officer will judge, and the score should tell them how it will land.
 */
export function Completeness({ caseFile }: { caseFile: CaseFile }) {
  const t = useT();
  const { score, missing } = completeness(caseFile);

  const tone = score >= 80 ? "bg-done" : score >= 50 ? "bg-wait" : "bg-urgent";

  return (
    <section className="sheet px-5 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="label">{t("case.completeness")}</p>
        <p className="num text-2xl font-medium">{score}%</p>
      </div>

      <div className="mt-3 h-1.5 bg-sunk rounded-full overflow-hidden" role="progressbar" aria-label={t("case.completeness")} aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn("h-full rounded-full transition-[width] duration-500", tone)} style={{ width: `${score}%` }} />
      </div>

      <p className="mt-3 text-sm text-ink-2 leading-snug">{t("case.completenessSub")}</p>

      {missing.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {missing.slice(0, 6).map((k) => (
            <li
              key={k}
              className="text-xs px-2 py-1 rounded-ctl border border-rule bg-sunk text-ink-3"
            >
              {t(k)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
