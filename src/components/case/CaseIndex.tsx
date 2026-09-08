"use client";

import { useState, type ReactNode } from "react";

import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/**
 * Everything that is not the next action, as an index rather than a stack.
 *
 * The overview had sixteen panels on it. Each one was individually defensible —
 * the money, the timeline, the rights, the escalation route, the aftercare
 * note, the sharing controls — and together they were six screens of scrolling
 * in front of somebody who had opened the page to find out what to do in the
 * next hour. Four of them were already hidden behind disclosure triangles,
 * which shortened the page without making it any easier to read: a fold still
 * takes a row, still has to be considered, and still says nothing about
 * whether there is anything inside it worth opening.
 *
 * So the panels became rows, and each row says what is in it before it is
 * opened: how much money is unaccounted for, how many pieces of evidence are
 * held, how many things have happened. A person can now answer "where is my
 * money" without opening anything at all — and if they do open it, everything
 * that used to be on the page is still there, unchanged.
 *
 * One at a time. Two open panels is a stack again, and the whole point is that
 * this screen never becomes one.
 */

export interface CaseIndexRow {
  id: string;
  title: string;
  /**
   * The live state of this row, shown on the closed row.
   *
   * This is what makes the index worth having rather than a menu: a row that
   * reads "₹85,000 · nothing returned yet" has answered the question, and a row
   * that reads "4 of 9 held" tells somebody whether opening it is worth their
   * attention right now.
   */
  summary?: string;
  /** Draws the eye when this row is the one that needs attention. */
  tone?: "urgent" | "wait" | "done";
  children: ReactNode;
}

export function CaseIndex({ title, rows }: { title: string; rows: CaseIndexRow[] }) {
  const t = useT();
  const [open, setOpen] = useState<string | null>(null);
  const live = rows.filter((row) => row.children);

  if (!live.length) return null;

  return (
    <section className="mt-7">
      <h2 className="!font-sans !text-[1.0625rem] !font-semibold !tracking-normal !leading-snug">
        {title}
      </h2>

      <ul className="mt-3 divide-y divide-rule border-y border-rule">
        {live.map((row) => {
          const expanded = open === row.id;
          return (
            <li key={row.id}>
              <h3>
                <button
                  onClick={() => setOpen(expanded ? null : row.id)}
                  aria-expanded={expanded}
                  className="flex w-full items-center gap-3 py-3.5 text-start min-h-11"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      row.tone === "urgent" ? "bg-urgent"
                        : row.tone === "wait" ? "bg-wait"
                          : row.tone === "done" ? "bg-done"
                            : "bg-ink/20",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.9375rem] font-medium leading-snug">{row.title}</span>
                    {row.summary && (
                      <span className="mt-0.5 block text-sm leading-snug text-ink-3">{row.summary}</span>
                    )}
                  </span>
                  <span
                    aria-hidden
                    className={cn("shrink-0 text-ink-3 transition-transform", expanded && "rotate-180")}
                  >
                    ⌄
                  </span>
                  <span className="sr-only">{expanded ? t("g.close") : t("g.open")}</span>
                </button>
              </h3>

              {/* Unmounted when closed, not hidden. These panels run clocks and
                  read stored evidence; keeping eight of them mounted behind a
                  `hidden` was most of what made this screen slow. */}
              {expanded && <div className="pb-5">{row.children}</div>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
