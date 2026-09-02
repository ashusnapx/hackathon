"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { findCategory, findSubcategory } from "@/lib/case/categories";
import type { ReportDraft } from "@/lib/report/draft";
import { formatBytes } from "@/lib/report/compress";
import { useT } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n";
import type { Stage } from "@/lib/report/schema";
import { fmtDate } from "@/lib/utils";

/**
 * The last screen before submission.
 *
 * The original puts a "Reset" button here, which discards the entire form —
 * the only affordance offered for correcting a mistake at the point where a
 * mistake is most likely to be noticed. Every row here instead links back to
 * the stage that owns it, with the draft intact.
 */
export function StageReview({
  draft,
  goTo,
  onSubmit,
  submitting,
  online,
}: {
  draft: ReportDraft;
  goTo: (s: Stage) => void;
  onSubmit: () => void;
  submitting: boolean;
  online: boolean;
}) {
  const t = useT();
  const [agreed, setAgreed] = useState(false);

  const cat = findCategory(draft.categoryId);
  const sub = findSubcategory(draft.categoryId, draft.subcategoryId);

  const rows: { labelKey: DictKey; value: string; stage: Stage }[] = [
    { labelKey: "f.category", value: cat?.label ?? "—", stage: "incident" },
    { labelKey: "f.subcategory", value: sub?.label ?? "—", stage: "incident" },
    { labelKey: "f.incidentAt", value: draft.incidentAt ? fmtDate(draft.incidentAt) : "—", stage: "incident" },
    { labelKey: "f.amount", value: draft.amount ? `₹${draft.amount.toLocaleString("en-IN")}` : "—", stage: "incident" },
    { labelKey: "f.narrative", value: draft.narrative.trim() || "—", stage: "incident" },
    {
      labelKey: "f.evidence",
      value: draft.files.length
        ? `${draft.files.length} · ${formatBytes(draft.files.reduce((s, f) => s + f.size, 0))}`
        : "—",
      stage: "evidence",
    },
    {
      labelKey: "f.suspectIds",
      value: draft.suspectIds.length ? draft.suspectIds.map((s) => s.value).join(", ") : "—",
      stage: "suspect",
    },
    { labelKey: "f.name", value: draft.name || "—", stage: "you" },
    { labelKey: "f.mobile", value: draft.mobile || "—", stage: "you" },
    { labelKey: "f.state", value: [draft.district, draft.state].filter(Boolean).join(", ") || "—", stage: "you" },
  ];

  // What is genuinely needed to route a complaint to a police unit, as opposed
  // to what the original form demands before it will let you save anything.
  const missing: string[] = [];
  if (!draft.narrative.trim()) missing.push(t("f.narrative"));
  if (!draft.name?.trim()) missing.push(t("f.name"));
  if (!draft.mobile || draft.mobile.length !== 10) missing.push(t("f.mobile"));
  if (!draft.state) missing.push(t("f.state"));

  const ready = missing.length === 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl">{t("rep.r.h")}</h2>
        <p className="mt-2 text-[1.0625rem] leading-[1.6] text-ink-2 max-w-prose">{t("rep.r.sub")}</p>
      </div>

      <dl className="border-t border-rule-strong">
        {rows.map((r) => (
          <div key={r.labelKey} className="border-b border-rule py-3.5 flex items-start gap-4">
            <dt className="w-32 sm:w-44 shrink-0 text-sm text-ink-3 pt-0.5">{t(r.labelKey)}</dt>
            <dd className="min-w-0 flex-1 text-[0.9375rem] leading-[1.6] break-words">
              {r.value === "—" ? <span className="text-ink-3">—</span> : r.value}
            </dd>
            <button
              onClick={() => goTo(r.stage)}
              className="shrink-0 text-sm text-ink-2 hover:text-ink underline underline-offset-4"
            >
              {t("rep.edit")}
            </button>
          </div>
        ))}
      </dl>

      {!ready && (
        <div className="sheet px-5 py-4 bg-wait-soft border-wait/30">
          <p className="text-[0.9375rem] font-medium">{t("rep.r.needed")}</p>
          <p className="mt-1.5 text-[0.9375rem] leading-[1.6] text-ink-2">{missing.join(" · ")}</p>
        </div>
      )}

      <div className="sheet px-5 py-5 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 w-5 h-5 shrink-0 accent-[var(--ink)]"
          />
          <span className="text-[0.9375rem] leading-[1.6]">{t("rep.r.agree")}</span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onSubmit} disabled={!ready || !agreed || submitting} size="lg">
            {submitting ? `${t("rep.r.submitting")}…` : online ? t("rep.r.submit") : t("rep.r.submitOffline")}
          </Button>
          {!online && <p className="text-sm text-wait">{t("rep.r.offlineNote")}</p>}
        </div>

        <p className="text-sm leading-[1.6] text-ink-3 max-w-prose">{t("rep.r.mock")}</p>
      </div>
    </div>
  );
}
