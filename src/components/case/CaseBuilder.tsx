"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, TextArea } from "@/components/ui/Field";
import { isFinancial } from "@/lib/case/tracks";
import { useT } from "@/lib/i18n/context";
import type { CaseFile } from "@/lib/case/types";
import { cn } from "@/lib/utils";

interface Props {
  caseFile: CaseFile;
  update: (patch: Partial<CaseFile> | ((c: CaseFile) => Partial<CaseFile>)) => void;
}

type Section = "evidence" | "money" | "suspect" | "you";

/** ISO ⇄ datetime-local, in the browser's own zone. */
function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function CaseBuilder({ caseFile: c, update }: Props) {
  const t = useT();
  const [open, setOpen] = useState<Section | null>("evidence");
  const financial = isFinancial(c);

  const sections: { id: Section; title: string; body: string; show: boolean }[] = [
    { id: "evidence", title: t("build.evidence.t"), body: t("build.evidence.b"), show: true },
    { id: "money", title: t("build.money.t"), body: "", show: financial },
    { id: "suspect", title: t("build.suspect.t"), body: t("build.suspect.b"), show: true },
    { id: "you", title: t("build.you.t"), body: t("build.you.b"), show: true },
  ];

  return (
    <section>
      <h2 className="text-2xl">{t("build.h1")}</h2>
      <p className="mt-1.5 text-[0.9375rem] text-ink-2 max-w-xl">{t("build.sub")}</p>

      <div className="mt-6 border-t border-rule-strong">
        {sections
          .filter((s) => s.show)
          .map((s) => (
            <div key={s.id} className="border-b border-rule">
              <button
                onClick={() => setOpen((o) => (o === s.id ? null : s.id))}
                aria-expanded={open === s.id}
                className="w-full flex items-center gap-4 py-4 text-start hover:bg-sunk/60 transition-colors px-1 -mx-1"
              >
                <span className="flex-1 text-lg">{s.title}</span>
                <span
                  className={cn("shrink-0 text-ink-3 transition-transform duration-200", open === s.id && "rotate-180")}
                  aria-hidden
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </button>

              {open === s.id && (
                <div className="pb-6 space-y-5 rise">
                  {s.body && <p className="text-[0.9375rem] leading-snug text-ink-2 max-w-2xl">{s.body}</p>}
                  {s.id === "evidence" && <EvidenceSection caseFile={c} update={update} />}
                  {s.id === "money" && <MoneySection caseFile={c} update={update} />}
                  {s.id === "suspect" && <SuspectSection caseFile={c} update={update} />}
                  {s.id === "you" && <YouSection caseFile={c} update={update} />}
                </div>
              )}
            </div>
          ))}
      </div>
    </section>
  );
}

function EvidenceSection({ caseFile: c, update }: Props) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [found, setFound] = useState<number | null>(null);

  const extract = useCallback(async () => {
    if (!c.evidenceText.trim()) return;
    setBusy(true);
    setSummary(null);
    try {
      const res = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: c.evidenceText }),
      });
      const d = await res.json();
      const merge = (a: string[], b: string[]) => Array.from(new Set([...a, ...(b ?? [])]));
      const count =
        (d.suspect?.phones?.length ?? 0) + (d.suspect?.upiIds?.length ?? 0) +
        (d.suspect?.accounts?.length ?? 0) + (d.refs?.length ?? 0);

      update((prev) => ({
        suspect: {
          phones: merge(prev.suspect.phones, d.suspect?.phones),
          upiIds: merge(prev.suspect.upiIds, d.suspect?.upiIds),
          accounts: merge(prev.suspect.accounts, d.suspect?.accounts),
          urls: merge(prev.suspect.urls, d.suspect?.urls),
          handles: merge(prev.suspect.handles, d.suspect?.handles),
        },
        entities: { ...prev.entities, refs: merge(prev.entities.refs, d.refs) },
        amount: prev.amount ?? d.amount ?? undefined,
        bank: {
          ...prev.bank,
          name: prev.bank.name || d.bankName || undefined,
          last4: prev.bank.last4 || d.victimAccountLast4 || undefined,
        },
      }));
      setSummary(d.summary ?? null);
      setFound(count);
    } finally {
      setBusy(false);
    }
  }, [c.evidenceText, update]);

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    update((prev) => ({
      files: [
        ...prev.files,
        ...Array.from(files).map((f) => ({ name: f.name, size: f.size, type: f.type })),
      ],
    }));
  };

  return (
    <>
      <TextArea
        label={t("build.evidence.t")}
        placeholder={t("build.evidence.ph")}
        value={c.evidenceText}
        onChange={(e) => update({ evidenceText: e.target.value })}
        rows={6}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={extract} disabled={busy || !c.evidenceText.trim()} size="sm">
          {busy ? `${t("build.evidence.extracting")}…` : t("build.evidence.extract")}
        </Button>
        {found !== null && !busy && (
          <span className="text-sm text-done">
            {t("build.evidence.found")}: <span className="num">{found}</span>
          </span>
        )}
      </div>

      {summary && <p className="text-[0.9375rem] text-ink-2 border-s-2 border-rule-strong ps-4">{summary}</p>}

      <div>
        <p className="text-[0.9375rem] font-medium">{t("build.evidence.files")}</p>
        <p className="mt-1 text-sm text-ink-3 leading-snug max-w-xl">{t("build.evidence.filesHint")}</p>
        <label className="mt-3 inline-flex items-center justify-center h-11 px-4 border border-rule-strong rounded-[3px] bg-raised hover:border-ink cursor-pointer text-[0.9375rem] transition-colors">
          {t("build.evidence.add")}
          <input type="file" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} />
        </label>

        {c.files.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {c.files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center gap-3 text-sm">
                <span className="num text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                <span className="truncate">{f.name}</span>
                <span className="num text-ink-3 ms-auto shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                <button
                  onClick={() => update((p) => ({ files: p.files.filter((_, j) => j !== i) }))}
                  className="text-ink-3 hover:text-urgent"
                  aria-label={`Remove ${f.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function MoneySection({ caseFile: c, update }: Props) {
  const t = useT();
  return (
    <div className="grid sm:grid-cols-2 gap-5">
      <Field
        label={t("build.money.amount")}
        type="number"
        inputMode="numeric"
        mono
        value={c.amount ?? ""}
        onChange={(e) => update({ amount: e.target.value ? Number(e.target.value) : undefined })}
      />
      <Field
        label={t("build.money.bank")}
        value={c.bank.name ?? ""}
        onChange={(e) => update((p) => ({ bank: { ...p.bank, name: e.target.value } }))}
      />
      <Field
        label={t("build.money.last4")}
        mono
        maxLength={4}
        value={c.bank.last4 ?? ""}
        onChange={(e) => update((p) => ({ bank: { ...p.bank, last4: e.target.value } }))}
      />
      <Field
        label={t("build.money.txn")}
        hint={t("build.money.txnHint")}
        mono
        value={c.entities.refs.join(", ")}
        onChange={(e) =>
          update((p) => ({
            entities: { ...p.entities, refs: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) },
          }))
        }
      />
      <Field
        label={t("build.money.alertAt")}
        hint={t("build.money.alertHint")}
        type="datetime-local"
        mono
        className="sm:col-span-2"
        value={toLocalInput(c.bankAlertAt)}
        onChange={(e) => update({ bankAlertAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
      />
    </div>
  );
}

function SuspectSection({ caseFile: c, update }: Props) {
  const t = useT();
  const list = (k: keyof CaseFile["suspect"]) => c.suspect[k].join(", ");
  const setList = (k: keyof CaseFile["suspect"]) => (e: React.ChangeEvent<HTMLInputElement>) =>
    update((p) => ({
      suspect: { ...p.suspect, [k]: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) },
    }));

  return (
    <div className="grid sm:grid-cols-2 gap-5">
      <Field label={t("build.suspect.phone")} mono optional value={list("phones")} onChange={setList("phones")} />
      <Field label={t("build.suspect.upi")} mono optional value={list("upiIds")} onChange={setList("upiIds")} />
      <Field label={t("build.suspect.account")} mono optional value={list("accounts")} onChange={setList("accounts")} />
      <Field label={t("build.suspect.url")} optional value={list("urls")} onChange={setList("urls")} />
      <Field label={t("build.suspect.handle")} optional className="sm:col-span-2" value={list("handles")} onChange={setList("handles")} />
    </div>
  );
}

function YouSection({ caseFile: c, update }: Props) {
  const t = useT();
  const set = (k: keyof CaseFile["victim"]) => (e: React.ChangeEvent<HTMLInputElement>) =>
    update((p) => ({ victim: { ...p.victim, [k]: e.target.value } }));

  return (
    <>
      <div className="grid sm:grid-cols-2 gap-5">
        <Field label={t("build.you.name")} autoComplete="name" value={c.victim.name ?? ""} onChange={set("name")} />
        <Field label={t("build.you.phone")} type="tel" mono autoComplete="tel" value={c.victim.phone ?? ""} onChange={set("phone")} />
        <Field label={t("build.you.email")} type="email" optional autoComplete="email" value={c.victim.email ?? ""} onChange={set("email")} />
        <Field label={t("build.you.state")} value={c.victim.state ?? ""} onChange={set("state")} />
        <Field label={t("build.you.district")} value={c.victim.district ?? ""} onChange={set("district")} />
        <Field label={t("build.you.address")} className="sm:col-span-2" value={c.victim.address ?? ""} onChange={set("address")} />
      </div>
      <p className="text-sm leading-snug text-ink-3 border-s-2 border-rule-strong ps-3 max-w-xl">
        {t("build.you.noId")}
      </p>
    </>
  );
}
