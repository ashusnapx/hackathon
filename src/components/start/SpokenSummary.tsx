"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { rupees } from "@/lib/intake/heard";
import { useI18n } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dict/en";
import type { Entities, Triage } from "@/lib/case/types";
import { findCategory } from "@/lib/case/categories";
import { THIS_MONTH } from "@/lib/ai/extract";
import { cn } from "@/lib/utils";

/**
 * What the model understood, handed back to be corrected.
 *
 * ── Why this is the answer to the language problem ──────────────────────────
 *
 * The rule-based readers in `lib/ai/extract.ts` will never cover twenty-three
 * languages. Somebody tried, adding romanised Hindi, then taka for Bengali,
 * then the major scripts — and every round of that is another arms race
 * against a spelling nobody thought of, still leaving most of the country on a
 * path that silently extracts nothing.
 *
 * The model already speaks all of them. So it reads the statement once, when
 * the person has finished, and this screen shows what it got. That single call
 * is also what makes it affordable: not one per keystroke, not one per interim
 * result — one, at the moment there is something worth reading.
 *
 * And it is editable, which is the part that matters. A confident wrong reading
 * is the failure this product cannot absorb, and the defence is not a better
 * model, it is showing the person what was understood while they are still
 * here to fix it. That works identically in Santali and in English.
 *
 * ── When the model could not be reached ─────────────────────────────────────
 *
 * The rules run instead and the panel says so, in as many words. It does not
 * quietly present a keyword match as a reading — somebody who is told which one
 * they are looking at knows how hard to check it.
 *
 * ── Doubt is a question, not a guess ────────────────────────────────────────
 *
 * Where the reading is genuinely ambiguous — two figures mentioned, a number
 * that could be theirs or the caller's — this asks rather than picking. One
 * question at a time, and only for things a wrong answer would actually cost
 * something.
 */

export interface Understood {
  triage: Triage;
  entities: Entities;
  source: "openai" | "rules";
  callerName?: string;
  bankName?: string;
}

/** One editable line. `value` is what we understood; empty means we did not. */
interface Row {
  id: string;
  label: DictKey;
  value: string;
  /** Free text, or a date the browser can pick. */
  kind?: "text" | "date";
}

export function SpokenSummary({
  understood, story, seed, onConfirm, onAddMore,
}: {
  understood: Understood | null;
  story: string;
  /**
   * Corrections already made in the read-back above.
   *
   * Seeded rather than merged afterwards, so somebody who has just fixed the
   * amount by tapping it does not find the model's version back in front of
   * them a second later, asking to be fixed again.
   */
  seed?: Partial<Record<string, string>>;
  onConfirm: (corrected: Record<string, string>) => void;
  onAddMore: () => void;
}) {
  const { t } = useI18n();
  // No effect copies the seed into state. A correction made upstairs is simply
  // the row's starting value (see `fromHeard` below), and `edits` holds only
  // what was changed *here* — so the two cannot drift, and there is no render
  // in which the model's version flashes up before the person's own answer
  // replaces it.
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (!understood) {
    return (
      <div className="sheet mt-4 p-5 text-[0.9375rem] text-ink-2">
        <span className="inline-flex items-center gap-2.5">
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-urgent" aria-hidden />
          {t("sum.reading")}
        </span>
      </div>
    );
  }

  const { triage, entities } = understood;
  const category = findCategory(triage.categoryId);

  /*
   * The read-back calls these `amount`, `when`, `contact`, `where`; the summary
   * calls them by the draft's own field names. One map, here, rather than two
   * vocabularies quietly drifting apart.
   */
  const fromHeard = (heardId: string) => seed?.[heardId];

  const rows: Row[] = [
    { id: "callerName", label: "sum.name", value: understood.callerName ?? "" },
    { id: "amount", label: "sum.amount", value: fromHeard("amount") ?? (triage.amount ? rupees(triage.amount) : "") },
    { id: "incidentAt", label: "sum.when", value: triage.incidentAt?.slice(0, 10) ?? "", kind: "date" },
    { id: "contact", label: "sum.contact", value: fromHeard("contact") ?? entities.phones[0] ?? entities.upiIds[0] ?? entities.emails[0] ?? "" },
    { id: "where", label: "sum.where", value: fromHeard("where") ?? entities.apps[0] ?? entities.urls[0] ?? "" },
    { id: "bankName", label: "sum.bank", value: understood.bankName ?? "" },
  ];

  const shown = (row: Row) => edits[row.id] ?? row.value;

  /*
   * The one thing worth asking about.
   *
   * Only surfaced when a wrong answer would actually cost something, and only
   * one at a time — a person who has just finished describing a fraud is not
   * going to work through a questionnaire about their own sentence.
   */
  const doubt = pickDoubt(story, understood, shown({ id: "amount", label: "sum.amount", value: "" }), t);

  return (
    <div className="sheet mt-4 p-4 sm:p-5">
      <h2 className="text-[1.125rem] leading-tight">{t("sum.title")}</h2>
      <p className="mt-1.5 text-[0.875rem] leading-[1.5] text-ink-2">{t("sum.sub")}</p>

      {understood.source === "rules" && (
        <p className="mt-3 rounded-ctl bg-wait-soft px-3 py-2.5 text-[0.8125rem] leading-[1.5]">
          {t("sum.rules")}
        </p>
      )}

      {category && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-ctl bg-sunk px-2.5 py-1 text-[0.8125rem]">
          <span className="text-ink-3">{t("sum.category")}:</span>
          <span className="font-medium">{category.label}</span>
        </p>
      )}

      <dl className="mt-4 border-t border-rule">
        {rows.map((row) => {
          const value = shown(row);
          const open = editing === row.id;
          return (
            <div key={row.id} className="flex items-baseline gap-3 border-b border-rule py-2.5">
              <dt className="w-[9rem] shrink-0 text-[0.8125rem] text-ink-3">{t(row.label)}</dt>
              <dd className="min-w-0 flex-1">
                {open ? (
                  <input
                    ref={inputRef}
                    type={row.kind === "date" ? "date" : "text"}
                    defaultValue={value}
                    onBlur={(e) => { setEdits((p) => ({ ...p, [row.id]: e.target.value })); setEditing(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    /* 16px, or iOS zooms the page when it is focused. */
                    className="w-full rounded-ctl border border-ink bg-raised px-2 py-1 text-base focus:outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditing(row.id)}
                    className={cn(
                      "group flex min-h-11 w-full items-center justify-between gap-3 text-start text-[0.9375rem]",
                      !value && "text-ink-3",
                    )}
                  >
                    <span className="min-w-0 break-words">{value || t("sum.empty")}</span>
                    <span className="shrink-0 text-[0.75rem] text-ink-3 underline underline-offset-2 group-hover:text-ink">
                      {value ? t("sum.edit") : t("sum.add")}
                    </span>
                  </button>
                )}
              </dd>
            </div>
          );
        })}
      </dl>

      {doubt && (
        <div className="mt-4 rounded-card border border-rule bg-sunk p-3.5">
          <p className="label">{t("sum.askTitle")}</p>
          <p className="mt-1.5 text-[0.9375rem] leading-[1.45]">{t(doubt.question)}</p>
          {doubt.options && (
            <div className="mt-3 flex flex-wrap gap-2">
              {doubt.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setEdits((p) => ({ ...p, [doubt.field]: option.value }))}
                  className="press min-h-11 rounded-ctl border border-rule-strong px-3 text-[0.875rem] hover:border-ink"
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <Button onClick={() => onConfirm(edits)} size="md" className="press">
          {t("sum.confirm")}
        </Button>
        <Button onClick={onAddMore} variant="secondary" size="md" className="press">
          {t("sum.more")}
        </Button>
      </div>
    </div>
  );
}

interface Doubt {
  field: string;
  question: DictKey;
  options?: { label: string; value: string }[];
}

/**
 * The single most useful question to ask, or none.
 *
 * Ordered by what a wrong answer costs. The amount is first because every
 * limited-liability clock and every letter carries it; the date is second for
 * the same reason. Anything we can simply show and let them correct is not a
 * question — it is already a row above.
 */
function pickDoubt(
  story: string,
  understood: Understood,
  currentAmount: string,
  t: (key: DictKey) => string,
): Doubt | null {
  // Two or more distinct figures in one statement: which one left the account?
  const figures = [...new Set((story.match(/\b\d[\d,]{2,}\b/g) ?? [])
    .map((n) => Number(n.replace(/,/g, "")))
    .filter((n) => n >= 100 && n < 100_000_000))];

  if (figures.length > 1 && currentAmount) {
    return {
      field: "amount",
      question: "sum.askAmount",
      options: figures.slice(0, 4).map((n) => ({ label: rupees(n), value: rupees(n) })),
    };
  }

  if (!understood.triage.incidentAt) {
    return { field: "incidentAt", question: "sum.askWhen" };
  }

  /*
   * "The tenth of this month", said on the eighth.
   *
   * A date after today is never a plausible incident date, so the reader rolls
   * it back to the month before — which is almost certainly what was meant, and
   * is the safe direction to be wrong in. But the person said "this month" out
   * loud, and quietly filing it under a different one is the kind of small
   * confident correction that ends up on a police complaint unnoticed.
   *
   * So it is asked. This is the whole argument for the panel in one row.
   */
  const said = understood.triage.incidentAt;
  if (said && THIS_MONTH.test(story)) {
    const now = new Date();
    const at = new Date(said);
    if (at.getMonth() !== now.getMonth() || at.getFullYear() !== now.getFullYear()) {
      const day = at.getDate();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), day);
      return {
        field: "incidentAt",
        question: "sum.askMonth",
        options: [
          { label: `${t("sum.lastMonth")} — ${fmt(at)}`, value: at.toISOString().slice(0, 10) },
          { label: `${t("sum.thisMonth")} — ${fmt(thisMonth)}`, value: thisMonth.toISOString().slice(0, 10) },
        ],
      };
    }
  }

  return null;
}

const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
