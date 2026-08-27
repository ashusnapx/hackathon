"use client";

import { findCategory, findSubcategory } from "@/lib/case/categories";
import { useT } from "@/lib/i18n/context";
import type { CaseFile } from "@/lib/case/types";
import { fmtDateTime, inr, since } from "@/lib/utils";

export function CaseHeader({ caseFile: c }: { caseFile: CaseFile }) {
  const t = useT();
  const cat = findCategory(c.triage?.categoryId);
  const sub = findSubcategory(c.triage?.categoryId, c.triage?.subcategoryId);
  const incidentAt = c.incidentAt || c.triage?.incidentAt || c.createdAt;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <p className="label">{t("case.ref")}</p>
          <p className="num text-2xl sm:text-3xl mt-1 tracking-tight">{c.ref}</p>
          <p className="mt-1.5 text-xs text-ink-3">{t("case.mock")}</p>
        </div>

        <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="label">{t("case.incident")}</dt>
            <dd className="num mt-1">{fmtDateTime(incidentAt)}</dd>
            <dd className="text-xs text-ink-3 mt-0.5">{since(incidentAt)} ago</dd>
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
          <span className="inline-flex items-center px-2.5 py-1 rounded-[2px] bg-sunk border border-rule text-sm">
            {cat.label}
          </span>
          {sub && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-[2px] bg-sunk border border-rule text-sm text-ink-2">
              {sub.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
