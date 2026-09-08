"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { getStoredEvidenceFile } from "@/lib/case/evidence-store";
import type { EvidenceAttachment } from "@/lib/case/evidence";
import { isEmptyRead, type ReadEvidenceResult } from "@/lib/ai/read-evidence";
import { inr } from "@/lib/case/money";
import type { CaseFile } from "@/lib/case/types";
import { useT } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dict/en";

/**
 * "Read this for me" — for the screenshot of a bank SMS.
 *
 * The single commonest piece of evidence in an Indian fraud case is a photo of
 * a bank message, and the vault has always treated it as bytes: stored, hashed,
 * listed, never read. The person was then asked to copy a twelve-digit UTR out
 * of it by hand, on a phone, while distressed — which is exactly where wrong
 * reference numbers on police complaints come from.
 *
 * Three things this deliberately does not do:
 *
 *   · It does not run on its own. Evidence lives in this browser, and sending a
 *     frame of it to a model is a decision the person makes per file, having
 *     been told in plain words what happens. There is no "analysing your
 *     files…" that nobody asked for.
 *   · It does not apply anything. Every field lands as a draft next to a button
 *     that says what it will change, because a model reading a compressed
 *     screenshot will sometimes turn a 5 into an S.
 *   · It does not touch PDFs. The provider reads images; offering it for a PDF
 *     and failing would teach people the feature is broken.
 */

const FIELDS: { key: keyof ReadEvidenceResult; label: DictKey }[] = [
  { key: "reference", label: "read.reference" },
  { key: "amountInr", label: "read.amount" },
  { key: "occurredAt", label: "read.when" },
  { key: "bankName", label: "read.bank" },
  { key: "accountLast4", label: "read.last4" },
  { key: "upiId", label: "read.upi" },
  { key: "phone", label: "read.phone" },
];

export function ReadEvidence({ attachment, update }: {
  attachment: EvidenceAttachment;
  update: (patch: (c: CaseFile) => Partial<CaseFile>) => void;
}) {
  const t = useT();
  const [state, setState] = useState<"idle" | "reading" | "done" | "error" | "empty">("idle");
  const [read, setRead] = useState<ReadEvidenceResult | null>(null);
  const [applied, setApplied] = useState(false);

  // Images only, and only when the bytes are actually here to send.
  const readable = attachment.storedLocally
    && Boolean(attachment.storageKey)
    && attachment.type.startsWith("image/");
  if (!readable) return null;

  const run = async () => {
    setState("reading");
    try {
      const stored = await getStoredEvidenceFile(attachment.storageKey!);
      if (!stored?.blob) {
        setState("error");
        return;
      }
      const image = await toDataUrl(stored.blob);
      const response = await fetch("/api/ai/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      if (!response.ok) {
        setState("error");
        return;
      }
      const body = await response.json() as { read?: ReadEvidenceResult };
      const result = body.read ?? {};
      setRead(result);
      setState(isEmptyRead(result) ? "empty" : "done");
    } catch {
      setState("error");
    }
  };

  /**
   * Fold the confirmed values into the case.
   *
   * Additive only. A field the case already has is left alone — the person
   * typed or confirmed it earlier, and a screenshot read by a model does not
   * get to overwrite that.
   */
  const apply = () => {
    if (!read) return;
    update((c) => {
      const patch: Partial<CaseFile> = {};
      if (read.amountInr && !c.amount) patch.amount = read.amountInr;
      if (read.occurredAt && !c.incidentAt) patch.incidentAt = new Date(`${read.occurredAt}T00:00:00`).toISOString();
      if (read.bankName && !c.bank.name) patch.bank = { ...c.bank, name: read.bankName };
      if (read.accountLast4 && !c.bank.last4) patch.bank = { ...(patch.bank ?? c.bank), last4: read.accountLast4 };

      const refs = read.reference && !c.entities.refs.includes(read.reference)
        ? [...c.entities.refs, read.reference]
        : c.entities.refs;
      const upiIds = read.upiId && !c.suspect.upiIds.includes(read.upiId)
        ? [...c.suspect.upiIds, read.upiId]
        : c.suspect.upiIds;
      const phones = read.phone && !c.suspect.phones.includes(read.phone)
        ? [...c.suspect.phones, read.phone]
        : c.suspect.phones;

      return {
        ...patch,
        entities: { ...c.entities, refs },
        suspect: { ...c.suspect, upiIds, phones },
        events: [
          ...c.events,
          { at: new Date().toISOString(), kind: "edit" as const, label: `Read from ${attachment.name}` },
        ],
      };
    });
    setApplied(true);
  };

  if (state === "idle") {
    return (
      <div className="mt-3">
        <Button onClick={run} size="sm" variant="secondary">{t("read.cta")}</Button>
        <p className="mt-1.5 text-xs leading-[1.55] text-ink-3">{t("read.consent")}</p>
      </div>
    );
  }

  if (state === "reading") return <p className="mt-3 text-sm text-ink-2">{t("read.reading")}…</p>;
  if (state === "error") {
    return (
      <p role="alert" className="mt-3 text-sm text-urgent-ink">
        {t("read.error")}{" "}
        <button onClick={run} className="underline underline-offset-4">{t("read.retry")}</button>
      </p>
    );
  }
  if (state === "empty") return <p className="mt-3 text-sm text-ink-2">{t("read.nothing")}</p>;

  const found = FIELDS
    .map((field) => ({ ...field, value: read?.[field.key] }))
    .filter((field) => field.value !== undefined && field.value !== "");

  return (
    <div className="mt-3 rounded-ctl border border-info/30 bg-info-soft px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold">{t("read.foundTitle")}</p>
        <span className="rounded-full border border-info/40 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-info">
          {t("call.draft")}
        </span>
      </div>
      <p className="mt-1 text-xs leading-[1.55] text-ink-3">{t("read.checkDigits")}</p>

      <dl className="mt-3 grid gap-x-4 gap-y-1.5 sm:grid-cols-[minmax(0,10rem)_1fr]">
        {found.map((field) => (
          <div key={String(field.key)} className="contents">
            <dt className="text-sm text-ink-3">{t(field.label)}</dt>
            <dd className="num text-sm break-words">
              {field.key === "amountInr" ? inr(Number(field.value)) : String(field.value)}
            </dd>
          </div>
        ))}
      </dl>

      {read?.note && <p className="mt-2 text-sm leading-[1.55] text-ink-2">{read.note}</p>}

      {applied ? (
        <p className="mt-3 text-sm text-done">{t("read.applied")}</p>
      ) : (
        <Button onClick={apply} size="sm" className="mt-3">{t("read.apply")}</Button>
      )}
    </div>
  );
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(blob);
  });
}
