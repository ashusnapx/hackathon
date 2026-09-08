"use client";

import { Emphasis } from "@/components/ui/Emphasis";
import { BANKS, RBI_CMS_URL, RBI_NODAL_LIST_URL, findBank } from "@/lib/case/banks";
import type { CaseFile } from "@/lib/case/types";
import { useT } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dict/en";

/**
 * Pick your bank, and get the part that is specific to it.
 *
 * "Write to your own bank" is an instruction that assumes the person already
 * knows where to write. Most do not: the branch will take a letter but is not
 * where an unauthorised-transaction dispute is decided, and the grievance
 * address is three clicks into a website written for people who are not
 * panicking.
 *
 * What is bank-specific here is one link, and that is deliberate. See
 * lib/case/banks.ts for why this file holds no nodal officer email addresses:
 * a dead mailbox is indistinguishable from a delivered complaint, and the
 * liability window runs out while somebody believes they have reported.
 *
 * Everything else on this screen is the same for every regulated bank because
 * the Reserve Bank set it rather than the bank — branch, nodal officer,
 * principal nodal officer, Ombudsman after thirty days — which is why it can
 * be stated once and trusted.
 */

const BRANCH_STEPS: DictKey[] = [
  "bank.br1",
  "bank.br2",
  "bank.br3",
  "bank.br4",
  "bank.br5",
  "bank.br6",
];

const LADDER: { titleKey: DictKey; bodyKey: DictKey }[] = [
  { titleKey: "bank.l1t", bodyKey: "bank.l1b" },
  { titleKey: "bank.l2t", bodyKey: "bank.l2b" },
  { titleKey: "bank.l3t", bodyKey: "bank.l3b" },
  { titleKey: "bank.l4t", bodyKey: "bank.l4b" },
];

export function BankDesk({ caseFile, update }: {
  caseFile: CaseFile;
  update: (patch: (c: CaseFile) => Partial<CaseFile>) => void;
}) {
  const t = useT();
  const selected = findBank(caseFile.bank?.id);

  return (
    <section className="rounded-card border border-rule bg-raised px-5 py-5">
      <h3 className="text-base font-semibold">{t("bank.deskTitle")}</h3>
      <p className="mt-1 text-sm leading-[1.55] text-ink-3">{t("bank.deskSub")}</p>

      <label className="mt-4 block">
        <span className="label">{t("bank.pick")}</span>
        <select
          value={caseFile.bank?.id ?? ""}
          onChange={(event) => {
            const id = event.target.value;
            const bank = findBank(id);
            update((c) => ({
              // The display name is stored alongside the id so the letters and
              // the complaint drafts read "State Bank of India" rather than
              // "sbi", and so a case still says which bank it was about if this
              // list is ever re-keyed.
              bank: { ...c.bank, id, ...(bank ? { name: bank.name } : {}) },
            }));
          }}
          className="mt-1.5 h-12 w-full rounded-ctl border border-rule-strong bg-paper px-3 text-[1rem]"
        >
          <option value="">{t("bank.pickNone")}</option>
          {BANKS.map((bank) => (
            <option key={bank.id} value={bank.id}>{bank.name}</option>
          ))}
        </select>
      </label>

      {selected ? (
        <div className="mt-4 rounded-ctl border border-info/30 bg-info-soft px-4 py-3.5">
          <p className="text-[0.9375rem] font-semibold">{selected.name}</p>
          <a
            href={selected.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 inline-flex min-h-11 items-center text-[0.9375rem] font-medium underline underline-offset-4"
          >
            {t(selected.deep ? "bank.openGrievance" : "bank.openSite")} ↗
          </a>
          {/* Which kind of link this is, said rather than implied. Promising a
              complaints page and landing somebody on a home page leaves them
              stuck with no idea what they are looking for. */}
          <p className="mt-1 text-xs leading-[1.5] text-ink-3">
            {t(selected.deep ? "bank.linkNote" : "bank.siteNote")}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm leading-[1.55] text-ink-3">{t("bank.pickWhy")}</p>
      )}

      <h4 className="mt-7 text-[0.9375rem] font-semibold">{t("bank.branchTitle")}</h4>
      <p className="mt-1 text-sm leading-[1.55] text-ink-3">{t("bank.branchSub")}</p>
      <ol className="mt-3 space-y-2.5">
        {BRANCH_STEPS.map((key, i) => (
          <li key={key} className="flex gap-3">
            <span
              className="num mt-px grid h-6 w-6 shrink-0 place-items-center rounded-full border border-rule-strong text-xs font-semibold text-ink-2"
              aria-hidden
            >
              {i + 1}
            </span>
            <span className="text-[1rem] leading-[1.5]"><Emphasis>{t(key)}</Emphasis></span>
          </li>
        ))}
      </ol>

      <h4 className="mt-7 text-[0.9375rem] font-semibold">{t("bank.ladderTitle")}</h4>
      <p className="mt-1 text-sm leading-[1.55] text-ink-3">{t("bank.ladderSub")}</p>
      <ol className="mt-3 divide-y divide-rule border-y border-rule">
        {LADDER.map((rung, i) => (
          <li key={rung.titleKey} className="flex gap-3.5 py-3">
            <span className="num mt-0.5 w-5 shrink-0 text-end text-sm font-semibold text-ink-3" aria-hidden>
              {i + 1}
            </span>
            <span>
              <span className="block text-[0.9375rem] font-medium">{t(rung.titleKey)}</span>
              <span className="mt-0.5 block text-sm leading-[1.5] text-ink-2">
                <Emphasis>{t(rung.bodyKey)}</Emphasis>
              </span>
            </span>
          </li>
        ))}
      </ol>

      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
        <a href={RBI_NODAL_LIST_URL} target="_blank" rel="noreferrer" className="underline underline-offset-4">
          {t("bank.nodalList")} ↗
        </a>
        <a href={RBI_CMS_URL} target="_blank" rel="noreferrer" className="underline underline-offset-4">
          {t("bank.cms")} ↗
        </a>
      </p>
    </section>
  );
}
