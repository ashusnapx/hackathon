"use client";

import { Button } from "@/components/ui/Button";
import { Countdown } from "./Countdown";
import { nextAction, upcomingDeadline } from "@/lib/case/tracks";
import { useT } from "@/lib/i18n/context";
import type { CaseFile } from "@/lib/case/types";
import { fmtDate } from "@/lib/utils";

/**
 * One instruction, sized like it matters. Everything else on the page is
 * reference material; this is the thing to act on.
 */
export function NextAction({ caseFile, onGoToTracks }: { caseFile: CaseFile; onGoToTracks: () => void }) {
  const t = useT();
  const next = nextAction(caseFile);
  const upcoming = upcomingDeadline(caseFile);

  if (!next) {
    return (
      <section className="sheet px-5 py-5">
        <p className="label">{t("case.nextTitle")}</p>
        <p className="mt-2 text-lg">
          {t(upcoming?.dateKind === "opens" ? "case.nextOpens" : "case.nextNone")}{" "}
          {upcoming?.deadline ? (
            <span className="num">{fmtDate(upcoming.deadline.toISOString())}</span>
          ) : (
            "—"
          )}
        </p>
      </section>
    );
  }

  const overdue = next.state === "missed";
  const { def } = next;

  return (
    <section
      className={`sheet overflow-hidden ${overdue ? "border-urgent/40" : "border-ink"}`}
      aria-labelledby="next-action-title"
    >
      <div className={`px-5 py-4 border-b ${overdue ? "border-urgent/25 bg-urgent-soft" : "border-rule bg-sunk"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={`label ${overdue ? "!text-urgent-ink/70" : ""}`}>{t("case.nextTitle")}</p>
          {next.deadline && (
            <span className="inline-flex items-center gap-2">
              {def.id === "ombudsman" && <span className="text-xs text-ink-3">{t("track.fileBy")}</span>}
              <Countdown target={next.deadline} />
            </span>
          )}
        </div>
      </div>

      <div className="px-5 py-5">
        <h3 id="next-action-title" className="text-2xl sm:text-3xl leading-tight">
          {t(def.titleKey)}
        </h3>
        <p className="mt-3 text-[0.9375rem] leading-[1.65] text-ink-2 max-w-2xl">{t(def.howKey)}</p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {def.action && (
            <Button
              href={def.action.href}
              variant={def.action.tel ? "urgent" : "primary"}
              size="md"
              external
            >
              {t(def.action.labelKey)}
            </Button>
          )}
          <Button onClick={onGoToTracks} variant="secondary" size="md">
            {t("case.tracksTitle")}
          </Button>
        </div>
      </div>
    </section>
  );
}
