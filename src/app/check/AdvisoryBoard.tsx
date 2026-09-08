"use client";

import { useEffect, useState } from "react";

import {
  ADVISORY_STALE_DAYS,
  advisoryAgeDays,
  baselineBoard,
  isAdvisory,
  type AdvisoryBoard as Board,
} from "@/lib/check/advisories";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/**
 * What is being run on people this week, with the date it was last confirmed.
 *
 * The radar beside this teaches the six patterns that do not change. This is
 * the half that does: it is refreshed nightly from I4C, Sanchar Saathi, CERT-In
 * and RBI, so a scam that started circulating on Tuesday can be on the page by
 * Wednesday without anybody shipping a release.
 *
 * It opens with the set committed to the repository and swaps in the live one
 * when it arrives, which means there is never a moment where a person looking
 * for a warning sees a spinner or an empty panel. The header says which of the
 * two they are reading and how old it is — a board that quietly went stale
 * would be worse than one that was never there, because it would be trusted.
 */
export function AdvisoryBoard({ onTry }: { onTry: (text: string) => void }) {
  const { t } = useI18n();
  const [board, setBoard] = useState<Board>(baselineBoard);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/check/advisories")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Board | null) => {
        if (!live || !data || !Array.isArray(data.advisories)) return;
        const advisories = data.advisories.filter(isAdvisory);
        // A live board with nothing in it is not an improvement on the shipped
        // one, so the shipped one stays.
        if (advisories.length) setBoard({ ...data, advisories });
      })
      .catch(() => {
        // The committed set is already on screen. Nothing to report.
      });
    return () => { live = false; };
  }, []);

  const age = advisoryAgeDays(board);
  const stale = age > ADVISORY_STALE_DAYS;

  return (
    <section className="sheet relative overflow-hidden px-5 py-5">
      <div className="jaali pointer-events-none absolute inset-0 text-urgent" aria-hidden />
      <div className="relative flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="label">{t("check.advTitle")}</p>
        <p className={cn("num text-[0.6875rem] uppercase tracking-wider", stale ? "text-wait" : "text-ink-3")}>
          {age <= 0 ? t("check.advToday") : `${age}${t("check.advDaysAgo")}`}
        </p>
      </div>
      <p className="relative mt-2 text-[0.9375rem] leading-[1.6] text-ink-2">
        {t(board.origin === "live" ? "check.advSubLive" : "check.advSubBaseline")}
      </p>
      {stale && <p className="mt-2 text-sm leading-[1.55] text-wait">{t("check.advStale")}</p>}

      <ul className="relative mt-4 divide-y divide-rule border-t border-rule">
        {board.advisories.map((a) => {
          const expanded = open === a.id;
          return (
            <li key={a.id} className="py-3">
              <button
                onClick={() => setOpen(expanded ? null : a.id)}
                aria-expanded={expanded}
                className="flex w-full items-start gap-2.5 text-start"
              >
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    a.severity === "high" ? "bg-urgent" : "bg-wait",
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.9375rem] font-medium leading-snug">{a.title}</span>
                  {!expanded && (
                    <span className="mt-0.5 block truncate text-sm text-ink-3">{a.tell}</span>
                  )}
                </span>
                <span className={cn("mt-0.5 shrink-0 text-ink-3 transition-transform", expanded && "rotate-180")} aria-hidden>
                  ⌄
                </span>
              </button>

              {expanded && (
                <div className="mt-2 ps-[1.125rem]">
                  <p className="text-sm leading-[1.6] text-ink-2">{a.summary}</p>
                  <p className="mt-2 border-s-2 border-urgent ps-3 text-sm font-medium leading-[1.55]">
                    {a.tell}
                  </p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
                    <a
                      href={a.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-4 hover:text-ink"
                    >
                      {a.sourceName}
                    </a>
                    <span aria-hidden>·</span>
                    <span className="num">{a.publishedAt}</span>
                  </p>
                  <button
                    onClick={() => onTry(a.summary)}
                    className="mt-2 text-sm text-ink-3 underline underline-offset-4 hover:text-ink"
                  >
                    {t("check.boardTry")} →
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
