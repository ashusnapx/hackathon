"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CATEGORIES, findCategory } from "@/lib/case/categories";
import { freezeChance } from "@/lib/case/time";
import { useT } from "@/lib/i18n/context";
import type { Entities, Triage } from "@/lib/case/types";
import { cn, inr } from "@/lib/utils";

interface Props {
  triage: Triage;
  entities: Entities;
  source: string;
  statement: string;
  onBack: () => void;
  onConfirm: (triage: Triage, entities: Entities, amount?: number, incidentAt?: string) => void;
}

/** ISO → the value a datetime-local input wants, in the browser's own zone. */
function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

const ENTITY_ROWS: [keyof Entities, string][] = [
  ["upiIds", "UPI ID"],
  ["phones", "Phone"],
  ["accounts", "Account"],
  ["refs", "Reference / UTR"],
  ["urls", "Link"],
  ["handles", "Handle"],
  ["emails", "Email"],
  ["apps", "App"],
];

export function TriageResult({ triage, entities, source, onBack, onConfirm }: Props) {
  const t = useT();
  const [edit, setEdit] = useState(false);
  const [categoryId, setCategoryId] = useState(triage.categoryId);
  const [subcategoryId, setSubcategoryId] = useState(triage.subcategoryId ?? "");
  const [amount, setAmount] = useState(triage.amount ? String(triage.amount) : "");
  const [incidentAt, setIncidentAt] = useState(toLocalInput(triage.incidentAt));

  const category = findCategory(categoryId);
  const subs = category?.subcategories ?? [];

  const minutes = incidentAt ? (Date.now() - new Date(incidentAt).getTime()) / 60_000 : 0;
  const chance = freezeChance(minutes);
  const financial = category?.portalTrack === "financial";

  const confidence = triage.confidence;
  const confLabel =
    confidence >= 0.75 ? t("triage.confHigh") : confidence >= 0.5 ? t("triage.confMed") : t("triage.confLow");
  const confTone = confidence >= 0.75 ? "text-done" : confidence >= 0.5 ? "text-ink-2" : "text-urgent";

  const found = useMemo(
    () => ENTITY_ROWS.map(([k, label]) => [label, entities[k] as string[]] as const).filter(([, v]) => v?.length),
    [entities],
  );

  const confirm = () => {
    const cat = findCategory(categoryId);
    onConfirm(
      {
        ...triage,
        categoryId,
        subcategoryId: subcategoryId || undefined,
        amount: amount ? Number(amount) : undefined,
        incidentAt: incidentAt ? new Date(incidentAt).toISOString() : triage.incidentAt,
        applicableTracks: cat?.tracks ?? triage.applicableTracks,
      },
      entities,
      amount ? Number(amount) : undefined,
      incidentAt ? new Date(incidentAt).toISOString() : triage.incidentAt,
    );
  };

  return (
    <div className="rise">
      <button onClick={onBack} className="text-sm text-ink-3 hover:text-ink underline underline-offset-4">
        ← {t("g.back")}
      </button>

      <h1 className="mt-6 text-4xl sm:text-5xl">{t("triage.h1")}</h1>
      <p className="mt-4 text-[1.0625rem] leading-[1.65] text-ink-2 max-w-xl">{t("triage.sub")}</p>

      {/* The first action, before anything else on the screen. If the reader gets
          no further than this card, they have still got the one thing that matters. */}
      {financial && minutes < 1440 && (
        <div className="mt-8 sheet border-urgent/40 bg-urgent-soft overflow-hidden">
          <div className="px-5 py-4">
            <p className="label !text-urgent-ink/70">{t("triage.firstAction")}</p>
            <p className="mt-2 text-xl text-urgent-ink leading-snug">{t("track.1930.t")}</p>
            <p className="mt-2 text-[0.9375rem] leading-snug text-urgent-ink/85 max-w-lg">
              {t("window.sub.strong")}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Button href="tel:1930" variant="urgent" size="md">{t("sos.call")}</Button>
              <span className="num text-sm text-urgent-ink/75">
                ≈ {Math.round(chance * 100)}% {t("window.chance")}
              </span>
            </div>
          </div>
        </div>
      )}

      <section className="mt-8 sheet">
        <div className="flex items-center justify-between px-5 py-3 border-b border-rule">
          <p className="label">{t("triage.category")}</p>
          <div className="flex items-center gap-4">
            <span className={cn("text-sm", confTone)}>
              {t("triage.confidence")}: {confLabel}
            </span>
            <button
              onClick={() => setEdit((e) => !e)}
              className="text-sm text-ink-3 hover:text-ink underline underline-offset-4"
            >
              {edit ? t("g.confirm") : t("triage.edit")}
            </button>
          </div>
        </div>

        <dl className="divide-y divide-rule">
          <Row label={t("triage.category")}>
            {edit ? (
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setSubcategoryId("");
                }}
                className="w-full h-11 px-3 bg-paper border border-rule-strong rounded-[3px] focus:outline-none focus:border-ink"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            ) : (
              category?.label
            )}
          </Row>

          <Row label={t("triage.subcategory")}>
            {edit ? (
              <select
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                className="w-full h-11 px-3 bg-paper border border-rule-strong rounded-[3px] focus:outline-none focus:border-ink"
              >
                <option value="">—</option>
                {subs.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            ) : (
              subs.find((s) => s.id === subcategoryId)?.label ?? "—"
            )}
          </Row>

          <Row label={t("triage.when")}>
            {edit ? (
              <input
                type="datetime-local"
                value={incidentAt}
                onChange={(e) => setIncidentAt(e.target.value)}
                className="w-full h-11 px-3 bg-paper border border-rule-strong rounded-[3px] num focus:outline-none focus:border-ink"
              />
            ) : (
              <span className="num">
                {incidentAt ? new Date(incidentAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}
              </span>
            )}
          </Row>

          {financial && (
            <Row label={t("triage.amount")}>
              {edit ? (
                <input
                  type="number"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="85000"
                  className="w-full h-11 px-3 bg-paper border border-rule-strong rounded-[3px] num focus:outline-none focus:border-ink"
                />
              ) : (
                <span className="num text-lg">{amount ? inr(Number(amount)) : "—"}</span>
              )}
            </Row>
          )}
        </dl>

        {triage.rationale && !edit && (
          <p className="px-5 py-3 border-t border-rule text-sm text-ink-3 leading-snug">{triage.rationale}</p>
        )}
      </section>

      {found.length > 0 ? (
        <section className="mt-6 sheet">
          <p className="label px-5 pt-4">{t("triage.found")}</p>
          <dl className="mt-2 divide-y divide-rule">
            {found.map(([label, values]) => (
              <div key={label} className="px-5 py-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <dt className="text-sm text-ink-3 w-32 shrink-0">{label}</dt>
                <dd className="num text-[0.9375rem] break-all">{values.join(", ")}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : (
        <p className="mt-6 text-[0.9375rem] text-ink-3">{t("triage.nothingFound")}</p>
      )}

      {triage.englishNarrative && (
        <section className="mt-6 sheet">
          <div className="flex items-center justify-between px-5 pt-4">
            <p className="label">{t("doc.inEnglish")}</p>
            {source === "openai" && <span className="label !text-ink-3">gpt</span>}
          </div>
          <p className="px-5 pb-4 pt-2 text-[0.9375rem] leading-[1.7] text-ink-2">{triage.englishNarrative}</p>
        </section>
      )}

      <div className="mt-10 flex flex-col sm:flex-row gap-3">
        <Button onClick={confirm} size="lg" className="flex-1">{t("triage.createCase")}</Button>
        <Button onClick={onBack} size="lg" variant="secondary">{t("triage.wrong")}</Button>
      </div>

      <p className="mt-4 text-sm text-ink-3">{t("g.aiNote")}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-3.5 grid sm:grid-cols-[9rem_minmax(0,1fr)] gap-x-4 gap-y-1.5 items-center">
      <dt className="text-sm text-ink-3">{label}</dt>
      <dd className="text-[0.9375rem]">{children}</dd>
    </div>
  );
}
