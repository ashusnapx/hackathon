"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { findCategory } from "@/lib/case/categories";
import { inr, moneyLedger } from "@/lib/case/money";
import { casePath } from "@/lib/case/store";
import { liveTracks } from "@/lib/case/tracks";
import type { CaseFile } from "@/lib/case/types";
import { useT } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dict/en";
import { cn, fmtDate } from "@/lib/utils";

/**
 * Every case somebody has, in a list they can actually work.
 *
 * The list was a reference, a category and a date, in whatever order the store
 * happened to return them. That is fine for two cases and useless for twelve:
 * the questions people arrive with are "which one needs me today" and "which
 * one had the money in it", and neither was answerable without opening each in
 * turn.
 *
 * The columns are chosen against those questions rather than from what a case
 * happens to contain:
 *
 *  · What is next, and whether it is overdue. This is the only column that
 *    changes on its own, and it is what makes the list worth revisiting.
 *  · How much money the case is about, because that is how people tell one
 *    from another when the categories are the same.
 *  · How far through the steps they are, as a count rather than a percentage —
 *    "3 of 10" is a fact, and a progress bar here would imply the remaining
 *    seven are ours to finish.
 *
 * Sorting defaults to urgency rather than date, because a list of cases sorted
 * by when they were created answers a question nobody has.
 */

type SortKey = "urgent" | "recent" | "amount" | "progress";

const PAGE = 8;

const SORTS: { id: SortKey; label: DictKey }[] = [
  { id: "urgent", label: "list.sortUrgent" },
  { id: "recent", label: "list.sortRecent" },
  { id: "amount", label: "list.sortAmount" },
  { id: "progress", label: "list.sortProgress" },
];

interface Row {
  file: CaseFile;
  amount: number;
  done: number;
  total: number;
  next: { title: DictKey; overdue: boolean; days: number | null } | null;
  /** Lower sorts first. */
  urgency: number;
}

function describe(file: CaseFile): Row {
  const tracks = liveTracks(file);
  const live = tracks.filter((track) => track.state !== "na");
  const done = live.filter((track) => track.state === "done").length;

  const missed = live.find((track) => track.state === "missed");
  const due = live.find((track) => track.state === "due");
  const chosen = missed ?? due ?? live.find((track) => track.state === "upcoming") ?? null;

  const days = chosen?.deadline
    ? Math.round((chosen.deadline.getTime() - Date.now()) / 86_400_000)
    : null;

  const ledger = moneyLedger(file);

  return {
    file,
    amount: ledger.disputedInr || file.amount || 0,
    done,
    total: live.length,
    next: chosen
      ? { title: chosen.def.titleKey, overdue: chosen.state === "missed", days }
      : null,
    // Overdue first, then due, then everything else by how soon it lands.
    urgency: missed ? -1_000_000 : due ? (days ?? 0) : 1_000 + (days ?? 9_999),
  };
}

export function CaseTable({ cases }: { cases: CaseFile[] }) {
  const t = useT();
  const [sort, setSort] = useState<SortKey>("urgent");
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const described = cases.map(describe);
    const sorted = [...described];
    if (sort === "urgent") sorted.sort((a, b) => a.urgency - b.urgency);
    if (sort === "recent") {
      sorted.sort((a, b) => Date.parse(b.file.createdAt) - Date.parse(a.file.createdAt));
    }
    if (sort === "amount") sorted.sort((a, b) => b.amount - a.amount);
    if (sort === "progress") {
      // Least finished first: this sort exists to find the case being neglected.
      sorted.sort((a, b) => a.done / (a.total || 1) - b.done / (b.total || 1));
    }
    return sorted;
  }, [cases, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  // Clamped rather than stored: changing the sort on the last page of a long
  // list must not leave somebody looking at an empty one.
  const current = Math.min(page, pages - 1);
  const shown = rows.slice(current * PAGE, current * PAGE + PAGE);

  return (
    <div>
      {rows.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t("list.sortBy")}>
          <span className="label me-1">{t("list.sortBy")}</span>
          {SORTS.map((option) => (
            <button
              key={option.id}
              onClick={() => { setSort(option.id); setPage(0); }}
              aria-pressed={sort === option.id}
              className={cn(
                "h-9 rounded-ctl border px-3 text-sm transition-colors",
                sort === option.id ? "border-ink bg-ink text-paper" : "border-rule-strong hover:border-ink",
              )}
            >
              {t(option.label)}
            </button>
          ))}
        </div>
      )}

      <ul className="mt-4 border-t border-rule-strong">
        {shown.map(({ file, amount, done, total, next }) => (
          <li key={file.id} className="border-b border-rule">
            <Link
              href={casePath(file.id)}
              className="-mx-1 flex flex-wrap items-baseline gap-x-4 gap-y-1.5 px-1 py-4 transition-colors hover:bg-sunk/60"
            >
              <span className="num text-[0.9375rem] font-medium">{file.ref}</span>

              <span className="min-w-0 text-[0.9375rem] text-ink-2">
                {findCategory(file.triage?.categoryId)?.label ?? "—"}
              </span>

              {amount > 0 && (
                <span className="num text-[0.9375rem] font-semibold">{inr(amount)}</span>
              )}

              <span className="num text-sm text-ink-3">
                {t("list.doneOf").replace("{n}", String(done)).replace("{total}", String(total))}
              </span>

              <span className="ms-auto flex shrink-0 items-center gap-2">
                {next ? (
                  <span
                    className={cn(
                      "chip rounded-ctl border px-1.5 py-0.5",
                      next.overdue
                        ? "border-urgent/40 bg-urgent-soft text-urgent-ink"
                        : "border-rule bg-sunk text-ink-3",
                    )}
                  >
                    {t(next.title)}
                  </span>
                ) : (
                  <span className="chip rounded-ctl border border-done/30 bg-done-soft px-1.5 py-0.5 text-done">
                    {t("list.allDone")}
                  </span>
                )}
                <span className="num text-sm text-ink-3">{fmtDate(file.createdAt)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/*
        Only when there is more than one page. A pager under a list of three
        cases is furniture that says the product expects you to have more
        problems than you do.
      */}
      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between gap-3" aria-label={t("list.pages")}>
          <button
            onClick={() => setPage(current - 1)}
            disabled={current === 0}
            className="inline-flex min-h-11 items-center rounded-ctl border border-rule-strong px-3.5 text-sm font-medium transition-colors hover:border-ink disabled:opacity-40"
          >
            {t("list.prev")}
          </button>
          <p className="num text-sm text-ink-3" aria-live="polite">
            {t("list.pageOf").replace("{n}", String(current + 1)).replace("{total}", String(pages))}
          </p>
          <button
            onClick={() => setPage(current + 1)}
            disabled={current >= pages - 1}
            className="inline-flex min-h-11 items-center rounded-ctl border border-rule-strong px-3.5 text-sm font-medium transition-colors hover:border-ink disabled:opacity-40"
          >
            {t("list.next")}
          </button>
        </nav>
      )}
    </div>
  );
}
