"use client";

import { CHECK_GROUPS, groupOf, type CheckResult } from "@/lib/check/signals";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

interface BoardModel {
  scamName?: string;
  tells?: string[];
  isLikelyFraud?: boolean;
}

interface WarningBoardProps {
  rules: CheckResult | null;
  model: BoardModel | null;
  onTry: (text: string) => void;
}

type Status = "flag" | "watch" | "clear" | "pending";

const DOT: Record<Status, string> = {
  flag: "bg-urgent",
  watch: "bg-wait",
  clear: "bg-ink-3/40",
  pending: "bg-rule",
};

/**
 * The warning board: fraud radar on the right, always visible.
 *
 * Two halves with opposite jobs. The radar teaches the six patterns hurting
 * Indians right now (each tap loads a matching sample into the checker). The
 * scan panel below renders the same fixed checklist for every run, so a
 * "clean" group reads as "no tell found" rather than disappearing — absence
 * that is visible cannot be mistaken for a clean chit the way a missing row
 * can.
 */
export function WarningBoard({ rules, model, onTry }: WarningBoardProps) {
  const { t } = useI18n();

  const radar = [
    { name: t("check.radar1t"), sub: t("check.radar1s"), ex: t("check.ex6") },
    { name: t("check.radar2t"), sub: t("check.radar2s"), ex: t("check.ex2") },
    { name: t("check.radar3t"), sub: t("check.radar3s"), ex: t("check.ex7") },
    { name: t("check.radar4t"), sub: t("check.radar4s"), ex: t("check.ex4") },
    { name: t("check.radar5t"), sub: t("check.radar5s"), ex: t("check.ex5") },
    { name: t("check.radar6t"), sub: t("check.radar6s"), ex: t("check.ex1") },
  ];

  const scanned = Boolean(rules);
  const byGroup = new Map<string, { status: Status; titles: string[] }>();
  if (rules) {
    for (const s of rules.signals) {
      const g = groupOf(s.id);
      const cur = byGroup.get(g);
      const st: Status = s.severity === "high" ? "flag" : "watch";
      if (!cur) byGroup.set(g, { status: st, titles: [s.title] });
      else {
        if (cur.status === "watch" && st === "flag") cur.status = "flag";
        if (!cur.titles.includes(s.title)) cur.titles.push(s.title);
      }
    }
  }
  const flagged = CHECK_GROUPS.filter((g) => (byGroup.get(g.id)?.status ?? "clear") !== "clear").length;

  return (
    // Not sticky itself: the column that holds it is, and two nested sticky
    // elements make the inner one stop scrolling with its own container.
    <aside className="space-y-6" aria-label={t("check.boardRadar")}>
      <section className="sheet px-5 py-5 border-urgent/30">
        <p className="label text-urgent-ink">⚠ {t("check.boardRadar")}</p>
        <p className="mt-2 text-[0.9375rem] leading-[1.6] text-ink-2">{t("check.boardRadarSub")}</p>
        <ul className="mt-4 space-y-3">
          {radar.map((r) => (
            <li key={r.name} className="border-t border-rule pt-3 first:border-t-0 first:pt-0">
              <p className="text-[0.9375rem] font-medium leading-snug">{r.name}</p>
              <p className="mt-1 text-sm leading-[1.6] text-ink-2">{r.sub}</p>
              <button
                onClick={() => onTry(r.ex)}
                className="mt-1.5 text-sm text-ink-3 hover:text-ink underline underline-offset-4"
              >
                {t("check.boardTry")} →
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="sheet px-5 py-5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="label">{t("check.boardScan")}</p>
          {scanned && (
            <p className="num text-xs text-ink-3">
              {flagged}/{CHECK_GROUPS.length}
            </p>
          )}
        </div>
        {!scanned ? (
          <p className="mt-2 text-[0.9375rem] leading-[1.65] text-ink-2">{t("check.boardScanEmpty")}</p>
        ) : (
          <>
            <ul className="mt-3 divide-y divide-rule border-t border-rule">
              {CHECK_GROUPS.map((g) => {
                const hit = byGroup.get(g.id);
                const status: Status = hit?.status ?? "clear";
                return (
                  <li key={g.id} className="py-2 flex items-start gap-2.5">
                    <span className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", DOT[status])} aria-hidden />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-sm font-medium leading-snug">{g.label}</span>
                        <span className="num text-[0.6875rem] uppercase tracking-wider text-ink-3">
                          {t(status === "flag" ? "check.boardFlag" : status === "watch" ? "check.boardWatch" : "check.boardClear")}
                        </span>
                      </span>
                      {hit ? (
                        <span className="mt-0.5 block text-sm leading-[1.55] text-ink-2">
                          {hit.titles.slice(0, 2).join(" · ")}
                        </span>
                      ) : (
                        <span className="mt-0.5 block text-sm leading-[1.55] text-ink-3">{g.blurb}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-ink-3">{t("check.boardClearNote")}</p>
          </>
        )}
      </section>

      <section className="sheet px-5 py-5 bg-wait-soft border-wait/30">
        <p className="label">{t("check.boardNevers")}</p>
        <ul className="mt-3 space-y-2.5">
          {[t("check.boardNever1"), t("check.boardNever2"), t("check.boardNever3")].map((n) => (
            <li key={n} className="flex gap-2.5 text-[0.9375rem] leading-[1.6]">
              <span className="text-urgent shrink-0 font-bold" aria-hidden>✕</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
        {model?.scamName && scanned && (
          <p className="mt-3 num text-xs text-ink-3">{model.scamName}</p>
        )}
      </section>
    </aside>
  );
}
