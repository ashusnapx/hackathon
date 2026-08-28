"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import type { CaseFile } from "@/lib/case/types";
import {
  getEvidence,
  calculateReadiness,
  setEvidenceStatus,
  attachEvidenceFile,
  removeEvidenceAttachment,
  downloadEvidenceSummary,
  validateEvidenceFile,
  type EvidenceItem,
  type EvidenceStatus,
} from "@/lib/case/evidence";
import { cn } from "@/lib/utils";

interface Props {
  caseFile: CaseFile;
  update: (patch: Partial<CaseFile> | ((c: CaseFile) => Partial<CaseFile>)) => void;
}

const CATEGORY_LABEL: Record<string, string> = {
  transaction: "Transaction evidence",
  communication: "Communication evidence",
  complaint: "Complaint & escalation evidence",
};

const CATEGORY_ORDER: Array<EvidenceItem["category"]> = ["transaction", "communication", "complaint"];

const STATUS_STYLES: Record<EvidenceStatus, string> = {
  added: "bg-done-soft text-done border-done/25",
  missing: "bg-urgent-soft text-urgent-ink border-urgent/30",
  not_applicable: "bg-sunk text-ink-3 border-rule",
};

const STATUS_LABEL: Record<EvidenceStatus, string> = {
  added: "Added",
  missing: "Missing",
  not_applicable: "Not applicable",
};

const STATUS_ICON: Record<EvidenceStatus, string> = {
  added: "✓",
  missing: "○",
  not_applicable: "—",
};

export function EvidenceVault({ caseFile, update }: Props) {
  const evidence = getEvidence(caseFile);
  const readiness = calculateReadiness(caseFile);
  const [openCategory, setOpenCategory] = useState<EvidenceItem["category"] | null>("transaction");
  const [error, setError] = useState<string | null>(null);

  const tone =
    readiness.level === "READY" ? "bg-done" : readiness.level === "PARTIALLY_READY" ? "bg-wait" : "bg-urgent";

  const levelLabel =
    readiness.level === "READY"
      ? "Ready"
      : readiness.level === "PARTIALLY_READY"
        ? "Partially ready"
        : "Not ready";

  const handleStatus = (id: string, status: EvidenceStatus) => {
    update((c) => setEvidenceStatus(c, id, status));
    setError(null);
  };

  const handleAttach = (id: string, files: FileList | null) => {
    if (!files?.length) return;
    const f = files[0];
    const err = validateEvidenceFile(f);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    update((c) =>
      attachEvidenceFile(c, id, { name: f.name, size: f.size, type: f.type || "application/octet-stream" }),
    );
  };

  const handleRemove = (id: string) => {
    update((c) => removeEvidenceAttachment(c, id));
  };

  return (
    <div className="space-y-8">
      {/* Summary */}
      <section className="sheet px-5 py-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <p className="label">Evidence vault</p>
          <p className="num text-2xl font-medium">{readiness.percentage}%</p>
        </div>

        <div
          className="mt-3 h-1.5 bg-sunk rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={readiness.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className={cn("h-full rounded-full transition-[width] duration-500", tone)} style={{ width: `${readiness.percentage}%` }} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className={cn("chip px-2 py-1 rounded-[2px] border", STATUS_STYLES[readiness.level === "READY" ? "added" : readiness.level === "PARTIALLY_READY" ? "not_applicable" : "missing"])}>
            {levelLabel}
          </span>
          <span className="text-sm text-ink-3">
            {readiness.counts.added} added · {readiness.counts.missing} missing · {readiness.counts.notApplicable} not applicable
          </span>
        </div>

        <p className="mt-3 text-sm text-ink-2 leading-snug">
          Preserve what you have now. Screenshots and references are strongest when captured before chats are deleted or numbers are blocked.
        </p>

        {readiness.recommendations.length > 0 && (
          <div className="mt-4 border-t border-rule pt-4">
            <p className="label">Recommended next</p>
            <ol className="mt-2 space-y-1.5">
              {readiness.recommendations.map((item, i) => (
                <li key={item.id} className="text-sm text-ink-2 flex gap-2">
                  <span className="num text-ink-3">{i + 1}.</span>
                  <span>Add {item.title.toLowerCase()}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <p className="mt-4 text-xs text-ink-3 border-s-2 border-rule-strong ps-3">
          Stored locally in this browser. Evidence files are not uploaded to any server or AI model.
        </p>
      </section>

      {/* Generate summary */}
      <section className="sheet px-5 py-5">
        <p className="label">Evidence summary</p>
        <p className="mt-2 text-[0.9375rem] text-ink-2 leading-snug max-w-xl">
          A case-ready PDF listing what you have, what is still missing and your timeline — to carry to the police station or bank.
        </p>
        <div className="mt-4">
          <Button onClick={() => downloadEvidenceSummary(caseFile)} size="sm">
            Generate Evidence Summary
          </Button>
        </div>
      </section>

      {/* Checklist grouped */}
      <section>
        <h2 className="text-2xl">Evidence checklist</h2>
        <p className="mt-1.5 text-[0.9375rem] text-ink-2 max-w-xl">
          Each item shows why it matters. Mark as added, missing or not applicable. Attach PNG, JPG or PDF (10 MB max).
        </p>

        {error && (
          <p className="mt-4 text-sm text-urgent bg-urgent-soft border border-urgent/20 px-3 py-2 rounded-[3px]">{error}</p>
        )}

        <div className="mt-6 border-t border-rule-strong">
          {CATEGORY_ORDER.map((cat) => {
            const items = evidence.filter((e) => e.category === cat);
            const addedCount = items.filter((e) => e.status === "added").length;
            const isOpen = openCategory === cat;
            return (
              <div key={cat} className="border-b border-rule">
                <button
                  onClick={() => setOpenCategory((o) => (o === cat ? null : cat))}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-4 py-4 text-start hover:bg-sunk/60 transition-colors px-1 -mx-1"
                >
                  <span className="flex-1 text-lg">{CATEGORY_LABEL[cat]}</span>
                  <span className="num text-xs text-ink-3 border border-rule px-1.5 py-0.5 rounded-[2px]">
                    {addedCount}/{items.length}
                  </span>
                  <span className={cn("shrink-0 text-ink-3 transition-transform duration-200", isOpen && "rotate-180")} aria-hidden>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </button>

                {isOpen && (
                  <div className="pb-6 space-y-4 rise">
                    {items.map((item) => (
                      <EvidenceRow
                        key={item.id}
                        item={item}
                        onStatus={handleStatus}
                        onAttach={handleAttach}
                        onRemove={handleRemove}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function EvidenceRow({
  item,
  onStatus,
  onAttach,
  onRemove,
}: {
  item: EvidenceItem;
  onStatus: (id: string, status: EvidenceStatus) => void;
  onAttach: (id: string, files: FileList | null) => void;
  onRemove: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="sheet px-4 py-4 sm:px-5">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "shrink-0 w-7 h-7 grid place-items-center rounded-[3px] border text-sm font-medium num",
            STATUS_STYLES[item.status],
          )}
          aria-hidden
        >
          {STATUS_ICON[item.status]}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[0.9375rem] font-medium leading-snug">{item.title}</p>
            <span className={cn("chip px-1.5 py-0.5 rounded-[2px] border", STATUS_STYLES[item.status])}>
              {STATUS_LABEL[item.status]}
            </span>
          </div>

          <p className="mt-1 text-sm text-ink-2 leading-snug">{item.description}</p>
          <p className="mt-1.5 text-xs text-ink-3 leading-snug border-s-2 border-rule-strong ps-3">{item.why}</p>

          {item.attachment && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm bg-sunk border border-rule px-3 py-2 rounded-[3px]">
              <span className="truncate font-mono text-xs">{item.attachment.name}</span>
              <span className="num text-xs text-ink-3">
                {(item.attachment.size / 1024).toFixed(0)} KB · {item.attachment.type.split("/")[1]?.toUpperCase() || "FILE"}
              </span>
              <button onClick={() => onRemove(item.id)} className="ms-auto text-xs text-ink-3 hover:text-urgent underline underline-offset-4">
                Remove
              </button>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {item.status === "missing" && (
              <>
                <label className="inline-flex items-center justify-center h-9 px-3 border border-rule-strong rounded-[3px] bg-raised hover:border-ink cursor-pointer text-sm transition-colors">
                  Add evidence
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                    className="sr-only"
                    onChange={(e) => {
                      onAttach(item.id, e.target.files);
                      if (inputRef.current) inputRef.current.value = "";
                    }}
                  />
                </label>
                <Button size="sm" variant="secondary" onClick={() => onStatus(item.id, "added")}>
                  Mark added
                </Button>
                <button onClick={() => onStatus(item.id, "not_applicable")} className="text-sm text-ink-3 hover:text-ink underline underline-offset-4">
                  Not applicable
                </button>
              </>
            )}

            {item.status === "added" && (
              <>
                {!item.attachment && (
                  <label className="inline-flex items-center justify-center h-9 px-3 border border-rule-strong rounded-[3px] bg-raised hover:border-ink cursor-pointer text-sm transition-colors">
                    Attach file
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                      className="sr-only"
                      onChange={(e) => {
                        onAttach(item.id, e.target.files);
                        if (inputRef.current) inputRef.current.value = "";
                      }}
                    />
                  </label>
                )}
                {item.attachment && (
                  <label className="inline-flex items-center justify-center h-9 px-3 border border-rule-strong rounded-[3px] bg-raised hover:border-ink cursor-pointer text-sm transition-colors">
                    Replace file
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                      className="sr-only"
                      onChange={(e) => {
                        onAttach(item.id, e.target.files);
                        if (inputRef.current) inputRef.current.value = "";
                      }}
                    />
                  </label>
                )}
                <button onClick={() => onStatus(item.id, "missing")} className="text-sm text-ink-3 hover:text-ink underline underline-offset-4">
                  Mark missing
                </button>
                <button onClick={() => onStatus(item.id, "not_applicable")} className="text-sm text-ink-3 hover:text-ink underline underline-offset-4">
                  Not applicable
                </button>
              </>
            )}

            {item.status === "not_applicable" && (
              <button onClick={() => onStatus(item.id, "missing")} className="text-sm text-ink-3 hover:text-ink underline underline-offset-4">
                Change
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
