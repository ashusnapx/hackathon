"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { inr, moneyLedger, newMoneyEntry, type MoneyEntry, type MoneyStateId } from "@/lib/case/money";
import type { CaseFile } from "@/lib/case/types";
import { useT } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dict/en";
import { cn } from "@/lib/utils";

/**
 * The bahi-khata: what happened to the money, on one line.
 *
 * Everything else in this case file is a list of things to do. This is the only
 * screen that answers the question the person actually has, which is where
 * their money is — and it answers it by refusing to guess. Every rupee that
 * leaves "nobody has said" does so because they were told something by someone
 * they can name, and wrote it down here.
 *
 * The bar is deliberately not a progress bar. A progress bar implies motion
 * towards completion; this one very often sits at 100% grey for weeks, and that
 * *is* the information — it is what turns "the police are looking into it" into
 * a visible fact about how long nothing has happened.
 *
 * Frozen money is drawn in the waiting colour, never the done colour. Money
 * under a lien in somebody else's account is not money back, it is money
 * stopped, and the gap between those two is where false hope lives.
 */

const STATE_STYLE: Record<MoneyStateId, { bar: string; dot: string; label: DictKey }> = {
  returned: { bar: "bg-done", dot: "bg-done", label: "money.returned" },
  held: { bar: "bg-wait", dot: "bg-wait", label: "money.held" },
  unrecoverable: { bar: "bg-urgent", dot: "bg-urgent", label: "money.unrecoverable" },
  unknown: { bar: "bg-ink/15", dot: "bg-ink/25", label: "money.unknown" },
};

const TOLD_BY: { id: MoneyEntry["toldBy"]; label: DictKey }[] = [
  { id: "bank", label: "money.by.bank" },
  { id: "police", label: "money.by.police" },
  { id: "portal", label: "money.by.portal" },
  { id: "court", label: "money.by.court" },
  { id: "other", label: "money.by.other" },
];

export function MoneyLedger({ caseFile, update }: {
  caseFile: CaseFile;
  update: (patch: (c: CaseFile) => Partial<CaseFile>) => void;
}) {
  const t = useT();
  const [adding, setAdding] = useState(false);
  const ledger = moneyLedger(caseFile);

  if (ledger.disputedInr <= 0 && !ledger.hasMovements) return null;

  const record = (entry: Omit<MoneyEntry, "id">) => {
    const created = newMoneyEntry(entry);
    update((c) => ({
      money: [...(c.money ?? []), created],
      events: [
        ...c.events,
        {
          at: new Date().toISOString(),
          kind: "edit" as const,
          label: `Money: ${inr(created.amountInr)} recorded as ${created.state}`,
        },
      ],
    }));
    setAdding(false);
  };

  const remove = (id: string) =>
    update((c) => ({ money: (c.money ?? []).filter((entry) => entry.id !== id) }));

  return (
    // `khata` draws the red cloth spine of a shopkeeper's ledger on the
    // leading edge. This panel is literally an account of what is owed and
    // what has come back, which is the one place that earns the reference.
    <section className="khata rounded-card border border-rule bg-raised px-5 py-5 ps-6">
      <h2 className="text-base font-semibold">{t("money.title")}</h2>

      {/*
        The answer, as the headline.

        This screen exists to answer one question — where is my money — and it
        used to answer it in the top-right corner in small grey type, under a
        flat grey bar and two paragraphs of explanation. On the day somebody
        arrives, the true answer is almost always "nobody has told you yet",
        and that is worth saying in the largest type on the page rather than
        implying it with an undivided bar.
      */}
      <div className="mt-4 text-center">
        <p className="num text-4xl sm:text-5xl font-semibold tracking-tight">{inr(ledger.disputedInr)}</p>
        <p className="mx-auto mt-2 max-w-[28ch] text-[0.9375rem] leading-[1.5] text-ink-2">
          {t(ledger.hasMovements ? "money.ofWhich" : "money.noneKnown")}
        </p>
      </div>

      {/*
        The bar and the tiles appear only once there is something to divide.
        A single grey block spanning the full width says "we know nothing"
        in the visual language of "we know everything", and it was the first
        thing on the screen.
      */}
      {ledger.hasMovements && (
        <>
          {/* One rule, divided. Not a progress bar — see the note above. */}
          <div className="mt-5 flex h-3.5 w-full overflow-hidden rounded-full border border-rule">
            {ledger.slices.map((slice) => (
              <div
                key={slice.state}
                className={cn("h-full", STATE_STYLE[slice.state].bar)}
                style={{ width: `${slice.percent}%` }}
                title={`${t(STATE_STYLE[slice.state].label)}: ${inr(slice.amountInr)}`}
              />
            ))}
          </div>

          {/*
            Tiles rather than a legend. A legend is a key to a picture; these
            are the numbers themselves, at a size somebody can compare across
            the row without reading the labels — which is the point, because
            the difference between money frozen and money returned is the one
            thing on this screen people most often get wrong.
          */}
          <dl className="mt-4 grid gap-2 sm:grid-cols-3">
            {ledger.slices
              .filter((slice) => slice.amountInr > 0)
              .map((slice) => (
                <div
                  key={slice.state}
                  className="rounded-ctl border border-rule bg-paper px-3.5 py-3"
                >
                  <dt className="flex items-center gap-2 text-sm text-ink-2">
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", STATE_STYLE[slice.state].dot)} aria-hidden />
                    {t(STATE_STYLE[slice.state].label)}
                  </dt>
                  <dd className="num mt-1 text-xl font-semibold">{inr(slice.amountInr)}</dd>
                </div>
              ))}
          </dl>
        </>
      )}

      {ledger.heldForDays !== null && (
        <p className="mt-4 rounded-ctl border border-wait/30 bg-wait-soft px-4 py-3 text-sm leading-[1.55] text-ink-2">
          {t("money.heldFor").replace("{days}", String(ledger.heldForDays))}
        </p>
      )}

      {ledger.overAllocated && (
        <p role="alert" className="mt-3 rounded-ctl border border-urgent/30 bg-urgent-soft px-4 py-3 text-sm leading-[1.55] text-urgent-ink">
          {t("money.overAllocated")}
        </p>
      )}

      {!ledger.hasMovements && (
        <p className="mx-auto mt-5 max-w-[46ch] text-center text-sm leading-[1.6] text-ink-3">
          {t("money.empty")}
        </p>
      )}

      {(caseFile.money ?? []).length > 0 && (
        <ul className="mt-4 divide-y divide-rule border-t border-rule">
          {(caseFile.money ?? []).map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", STATE_STYLE[entry.state].dot)} aria-hidden />
              <span className="num text-sm font-semibold">{inr(entry.amountInr)}</span>
              <span className="text-sm text-ink-2">{t(STATE_STYLE[entry.state].label)}</span>
              <span className="text-sm text-ink-3">
                · {t(TOLD_BY.find((option) => option.id === entry.toldBy)?.label ?? "money.by.other")}
              </span>
              {entry.ref && <span className="num text-xs text-ink-3">{entry.ref}</span>}
              <span className="num ms-auto text-xs text-ink-3">{entry.at.slice(0, 10)}</span>
              <button
                onClick={() => remove(entry.id)}
                className="text-xs text-ink-3 underline underline-offset-4 hover:text-urgent-ink"
              >
                {t("money.remove")}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/*
        The caveat, at the foot rather than the head. It used to sit under the
        title, above the number — qualifying something the reader had not seen
        yet. It matters too much to drop: people believe that filing a
        complaint moves money, and it does not.
      */}
      <p className="mt-5 border-t border-rule pt-4 text-xs leading-[1.55] text-ink-3">{t("money.sub")}</p>

      {adding ? (
        <AddMovement onCancel={() => setAdding(false)} onSave={record} holds={caseFile.money ?? []} />
      ) : (
        <div className={cn("mt-5", !ledger.hasMovements && "text-center")}>
          <Button onClick={() => setAdding(true)} size="md" variant={ledger.hasMovements ? "secondary" : "primary"}>
            {t("money.add")}
          </Button>
        </div>
      )}
    </section>
  );
}

function AddMovement({ onSave, onCancel, holds }: {
  onSave: (entry: Omit<MoneyEntry, "id">) => void;
  onCancel: () => void;
  holds: MoneyEntry[];
}) {
  const t = useT();
  const [state, setState] = useState<MoneyEntry["state"]>("held");
  const [amount, setAmount] = useState("");
  const [at, setAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [toldBy, setToldBy] = useState<MoneyEntry["toldBy"]>("bank");
  const [ref, setRef] = useState("");
  const [releases, setReleases] = useState("");

  const value = Number(amount.replace(/[^\d]/g, ""));
  const openHolds = holds.filter((entry) => entry.state === "held");
  const ready = value > 0 && Boolean(at);

  return (
    <div className="mt-4 rounded-ctl border border-rule bg-raised p-4">
      <p className="text-sm font-semibold">{t("money.addTitle")}</p>
      <p className="mt-1 text-xs leading-[1.55] text-ink-3">{t("money.addNote")}</p>

      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label={t("money.addTitle")}>
        {(["held", "returned", "unrecoverable"] as const).map((option) => (
          <button
            key={option}
            onClick={() => setState(option)}
            aria-pressed={state === option}
            className={cn(
              "h-10 rounded-ctl border px-3 text-sm font-medium transition-colors",
              state === option ? "border-ink bg-ink text-paper" : "border-rule-strong hover:border-ink",
            )}
          >
            {t(STATE_STYLE[option].label)}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field
          label={t("money.amount")}
          value={amount}
          mono
          inputMode="numeric"
          onChange={(e) => setAmount(e.target.value)}
          placeholder="10000"
        />
        <Field label={t("money.when")} type="date" value={at} onChange={(e) => setAt(e.target.value)} />
      </div>

      <div className="mt-3">
        <p className="label">{t("money.whoSaid")}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {TOLD_BY.map((option) => (
            <button
              key={option.id}
              onClick={() => setToldBy(option.id)}
              aria-pressed={toldBy === option.id}
              className={cn(
                "h-9 rounded-ctl border px-3 text-sm transition-colors",
                toldBy === option.id ? "border-ink bg-ink text-paper" : "border-rule-strong hover:border-ink",
              )}
            >
              {t(option.label)}
            </button>
          ))}
        </div>
      </div>

      <Field
        label={t("money.ref")}
        value={ref}
        mono
        onChange={(e) => setRef(e.target.value)}
        className="mt-3"
      />

      {/* Only asked when it can be answered, and only when it matters: this is
          how the ledger knows a refund settles an existing freeze rather than
          being separate money. */}
      {state !== "held" && openHolds.length > 0 && (
        <label className="mt-3 block">
          <span className="label">{t("money.releases")}</span>
          <select
            value={releases}
            onChange={(e) => setReleases(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-ctl border border-rule-strong bg-paper px-3 text-[0.9375rem]"
          >
            <option value="">{t("money.releasesNone")}</option>
            {openHolds.map((hold) => (
              <option key={hold.id} value={hold.id}>
                {inr(hold.amountInr)} · {hold.at.slice(0, 10)}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={!ready}
          onClick={() =>
            onSave({
              state,
              amountInr: value,
              at: new Date(`${at}T00:00:00`).toISOString(),
              toldBy,
              ...(ref.trim() ? { ref: ref.trim() } : {}),
              ...(releases ? { releases } : {}),
            })
          }
        >
          {t("money.save")}
        </Button>
        <Button size="sm" variant="secondary" onClick={onCancel}>{t("g.cancel")}</Button>
      </div>
    </div>
  );
}
