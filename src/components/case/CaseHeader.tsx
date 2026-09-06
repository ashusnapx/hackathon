"use client";

import { useState } from "react";
import { findCategory, findSubcategory } from "@/lib/case/categories";
import { useT } from "@/lib/i18n/context";
import type { CaseFile } from "@/lib/case/types";
import type { DeleteCaseResult } from "@/lib/case/store";
import { fmtDateTime, inr, since, writeToClipboard } from "@/lib/utils";

export function CaseHeader({ caseFile: c, onDelete }: { caseFile: CaseFile; onDelete: () => Promise<DeleteCaseResult> }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [cleanupIncomplete, setCleanupIncomplete] = useState(false);

  // The reference is the one thing a citizen has to carry between here, a phone
  // call and a police counter. Making them retype it off a screen is how it
  // gets written down wrong.
  const copyRef = async () => {
    if (await writeToClipboard(c.ref)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };
  const cat = findCategory(c.triage?.categoryId);
  const sub = findSubcategory(c.triage?.categoryId, c.triage?.subcategoryId);
  const incidentAt = c.incidentAt || c.triage?.incidentAt;
  const incidentRange = c.incidentTimingRange === "last-hour"
    ? t("intake.timingHour")
    : c.incidentTimingRange === "today"
      ? t("intake.timingToday")
      : c.incidentTimingRange === "older"
        ? t("intake.timingOlder")
        : c.incidentTimingRange === "unsure"
          ? t("intake.notSure")
          : "—";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <p className="label">{t("case.ref")}</p>
          <button
            onClick={copyRef}
            className="group mt-1 flex min-h-11 items-center gap-2.5 text-start"
            aria-label={t("case.copyRef")}
          >
            <span className="num text-2xl sm:text-3xl tracking-tight">{c.ref}</span>
            <span className="text-xs text-ink-3 group-hover:text-ink transition-colors shrink-0">
              {copied ? t("doc.copied") : t("case.copyRef")}
            </span>
          </button>
          <p className="mt-1.5 text-xs text-ink-3">{t("case.mock")}</p>
        </div>

        <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="label">{t("case.incident")}</dt>
            <dd className="num mt-1">{incidentAt ? fmtDateTime(incidentAt) : incidentRange}</dd>
            {incidentAt && <dd className="text-xs text-ink-3 mt-0.5">{since(incidentAt)} ago</dd>}
          </div>
          {c.amount ? (
            <div>
              <dt className="label">{t("case.lost")}</dt>
              <dd className="num mt-1 text-lg">{inr(c.amount)}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {cat && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-ctl bg-sunk border border-rule text-sm">
            {cat.label}
          </span>
          {sub && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-ctl bg-sunk border border-rule text-sm text-ink-2">
              {sub.label}
            </span>
          )}
        </div>
      )}

      <div className="mt-6 border-t border-rule pt-4">
        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => { setConfirmingDelete(true); setDeleteError(false); }}
            className="inline-flex min-h-11 items-center text-sm text-ink-3 underline underline-offset-4 hover:text-urgent"
          >
            {t("case.delete")}
          </button>
        ) : (
          <div className="rounded-ctl border border-urgent/25 bg-urgent-soft px-4 py-3 max-w-2xl">
            {cleanupIncomplete ? (
              <>
                <p role="alert" className="text-sm leading-[1.55] text-urgent-ink">
                  {t("case.deleteCleanupError")}
                </p>
                <a href="/cases" className="mt-3 inline-flex h-11 items-center rounded-ctl border border-rule-strong px-4 text-sm font-semibold">
                  {t("case.deleteContinue")}
                </a>
              </>
            ) : (
              <>
                <p className="text-sm leading-[1.55] text-urgent-ink">{t("case.deleteConfirm")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => {
                      setDeleting(true);
                      setDeleteError(false);
                      void onDelete()
                        .then((result) => {
                          if (result.evidenceCleanup === "incomplete") {
                            setDeleting(false);
                            setCleanupIncomplete(true);
                          }
                        })
                        .catch(() => {
                          setDeleting(false);
                          setDeleteError(true);
                        });
                    }}
                    className="h-11 rounded-ctl border border-urgent-ink bg-urgent px-4 text-sm font-semibold disabled:opacity-50"
                  >
                    {deleting ? t("case.deleting") : t("g.confirm")}
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setConfirmingDelete(false)}
                    className="h-11 rounded-ctl border border-rule-strong px-4 text-sm font-semibold disabled:opacity-50"
                  >
                    {t("g.cancel")}
                  </button>
                </div>
                {deleteError && <p role="alert" className="mt-2 text-sm text-urgent-ink">{t("case.deleteError")}</p>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
