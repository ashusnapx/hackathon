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
  evidenceAttachmentBlockReason,
  validateEvidenceFile,
  type EvidenceItem,
  type EvidenceStatus,
} from "@/lib/case/evidence";
import {
  getStoredEvidenceFile,
  removeStoredEvidenceFile,
  storeEvidenceFile,
  withEvidenceCaseLock,
} from "@/lib/case/evidence-store";
import { cn } from "@/lib/utils";

interface Props {
  caseFile: CaseFile;
  update: (patch: Partial<CaseFile> | ((c: CaseFile) => Partial<CaseFile>)) => void;
  persistUpdate: (patch: (c: CaseFile) => CaseFile) => boolean;
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
  added: "Marked held",
  missing: "Missing",
  not_applicable: "Not applicable",
};

const STATUS_ICON: Record<EvidenceStatus, string> = {
  added: "✓",
  missing: "○",
  not_applicable: "—",
};

export function EvidenceVault({ caseFile, update, persistUpdate }: Props) {
  const evidence = getEvidence(caseFile);
  const readiness = calculateReadiness(caseFile);
  const attachmentBlockReason = evidenceAttachmentBlockReason(caseFile);
  const attachmentBlockMessage = attachmentBlockReason === "child-sexual-content-risk"
    ? "Local attachment is disabled for this child-safety case. Do not upload, forward, download or make another copy of sexual material involving anyone under 18. Preserve the source device, URL or account details without opening the material again, and contact 1098, 112 or a trained safeguarding professional."
    : attachmentBlockReason === "intimate-content-risk"
      ? "Local attachment is disabled for this intimate-content case so Kavach does not create another copy. Preserve the source device, URL or account details without forwarding the material. You can still mark an item as held elsewhere."
      : null;
  const [openCategory, setOpenCategory] = useState<EvidenceItem["category"] | null>("transaction");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const operationInFlight = useRef(false);

  const tone =
    readiness.level === "READY" ? "bg-done" : readiness.level === "PARTIALLY_READY" ? "bg-wait" : "bg-urgent";

  const levelLabel =
    readiness.counts.totalApplicable === 0
      ? "No items marked applicable"
      : readiness.level === "READY"
      ? "Most items addressed"
      : readiness.level === "PARTIALLY_READY"
        ? "Checklist in progress"
        : "Checklist just started";

  const handleStatus = (id: string, status: EvidenceStatus) => {
    update((c) => setEvidenceStatus(c, id, status));
    setError(null);
  };

  const handleAttach = async (id: string, files: FileList | null) => {
    if (!files?.length || operationInFlight.current) return;
    if (attachmentBlockMessage) {
      setError(attachmentBlockMessage);
      return;
    }
    const f = files[0];
    const err = validateEvidenceFile(f);
    if (err) {
      setError(err);
      return;
    }
    operationInFlight.current = true;
    setBusyId(id);
    setError(null);
    try {
      await withEvidenceCaseLock(caseFile.id, async () => {
        const stored = await storeEvidenceFile(caseFile.id, id, f);
        const replaced = { storageKey: undefined as string | undefined };
        if (!persistUpdate((c) => {
          // Resolve the previous blob only after acquiring the cross-tab lock;
          // this case may have refreshed while the operation was waiting.
          replaced.storageKey = getEvidence(c)
            .find((item) => item.id === id)?.attachment?.storageKey;
          return attachEvidenceFile(c, id, stored);
        })) {
          let orphaned = false;
          try {
            await removeStoredEvidenceFile(stored.storageKey);
          } catch {
            orphaned = true;
          }
          throw new Error(orphaned
            ? "The case record could not be saved and the browser could not remove the new, untracked evidence bytes. The previous attachment is unchanged. Clear Kavach site data to remove the orphaned copy."
            : "The file bytes were not linked because the case record could not be saved. The previous attachment is unchanged.");
        }
        if (replaced.storageKey && replaced.storageKey !== stored.storageKey) {
          try {
            await removeStoredEvidenceFile(replaced.storageKey);
          } catch {
            setError("The replacement is saved and its fingerprint matches, but the browser could not remove the older orphaned copy. Clear Kavach site data after keeping any originals you need.");
          }
        }
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The file could not be stored in this browser.");
    } finally {
      operationInFlight.current = false;
      setBusyId(null);
    }
  };

  const handleRemove = async (id: string) => {
    if (operationInFlight.current) return;
    operationInFlight.current = true;
    setBusyId(id);
    setError(null);
    try {
      await withEvidenceCaseLock(caseFile.id, async () => {
        // Remove the manifest first. If persistence fails, the original bytes
        // and record remain intact. A later cleanup failure is surfaced.
        const removed = { attachment: undefined as EvidenceItem["attachment"] };
        if (!persistUpdate((c) => {
          // Resolve inside the lock so cleanup follows the manifest actually
          // removed, rather than the version rendered before this tab waited.
          removed.attachment = getEvidence(c)
            .find((item) => item.id === id)?.attachment;
          return removeEvidenceAttachment(c, id);
        })) {
          throw new Error("The attachment was kept because the case record could not be saved.");
        }
        const removedAttachment = removed.attachment;
        if (removedAttachment?.storageKey && removedAttachment.storedLocally) {
          try {
            await removeStoredEvidenceFile(removedAttachment.storageKey);
          } catch {
            setError("The attachment record was removed, but the browser could not verify deletion of the orphaned local bytes. Clear Kavach site data to remove them.");
          }
        }
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The local file could not be removed.");
    } finally {
      operationInFlight.current = false;
      setBusyId(null);
    }
  };

  const handleDownload = async (id: string) => {
    if (operationInFlight.current) return;
    if (attachmentBlockMessage) {
      setError(attachmentBlockMessage);
      return;
    }
    const attachment = evidence.find((item) => item.id === id)?.attachment;
    if (!attachment?.storageKey || !attachment.storedLocally) {
      setError("Only the file record is available. Reattach the original file to store its bytes here.");
      return;
    }
    operationInFlight.current = true;
    setBusyId(id);
    setError(null);
    try {
      const stored = await getStoredEvidenceFile(attachment.storageKey);
      if (!stored) throw new Error("The file is no longer in this browser. It may have been removed with site data.");
      const href = URL.createObjectURL(stored.blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = stored.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(href), 1_000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The local file could not be opened.");
    } finally {
      operationInFlight.current = false;
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Summary */}
      <section className="sheet px-5 py-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <p className="label">Evidence map</p>
          <p className="num text-2xl font-medium">{readiness.percentage}% checklist coverage</p>
        </div>

        <div
          className="mt-3 h-1.5 bg-sunk rounded-full overflow-hidden"
          role="progressbar"
          aria-label="Evidence checklist coverage"
          aria-valuenow={readiness.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className={cn("h-full rounded-full transition-[width] duration-500", tone)} style={{ width: `${readiness.percentage}%` }} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className={cn("chip px-2 py-1 rounded-ctl border", STATUS_STYLES[readiness.level === "READY" ? "added" : readiness.level === "PARTIALLY_READY" ? "not_applicable" : "missing"])}>
            {levelLabel}
          </span>
          <span className="text-sm text-ink-3">
            {readiness.counts.added} marked held · {readiness.counts.storedLocally} local files · {readiness.counts.missing} missing · {readiness.counts.notApplicable} not applicable
          </span>
        </div>

        <p className="mt-3 text-sm text-ink-2 leading-snug">
          If it is safe, preserve the original records without continuing contact or delaying urgent help. This score tracks your checklist; it does not decide legal sufficiency or authenticity.
        </p>

        {readiness.recommendations.length > 0 && (
          <div className="mt-4 border-t border-rule pt-4">
            <p className="label">Recommended next</p>
            <ol className="mt-2 space-y-1.5">
              {readiness.recommendations.map((item, i) => (
                <li key={item.id} className="text-sm text-ink-2 flex gap-2">
                  <span className="num text-ink-3">{i + 1}.</span>
                  <span>Review {item.title.toLowerCase()}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <p className="mt-4 text-xs text-ink-3 border-s-2 border-rule-strong ps-3">
          Files attached here are stored as actual bytes in this browser&apos;s IndexedDB and fingerprinted with SHA-256. They are not sent to Kavach&apos;s server or an AI model. Clearing site data deletes them; keep the originals too.
        </p>

        {attachmentBlockMessage && (
          <p role="alert" className="mt-4 text-sm leading-snug text-urgent bg-urgent-soft border border-urgent/20 px-3 py-3 rounded-ctl">
            {attachmentBlockMessage}
          </p>
        )}
      </section>

      {/* Generate summary */}
      <section className="sheet px-5 py-5">
        <p className="label">Printable evidence manifest</p>
        <p className="mt-2 text-[0.9375rem] text-ink-2 leading-snug max-w-xl">
          Generate a PDF checklist of what you have, what is missing, your timeline and available fingerprints. The PDF does not embed the evidence files and is not an official complaint.
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
          <p role="alert" className="mt-4 text-sm text-urgent bg-urgent-soft border border-urgent/20 px-3 py-2 rounded-ctl">{error}</p>
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
                  <span className="num text-xs text-ink-3 border border-rule px-1.5 py-0.5 rounded-ctl">
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
                        onDownload={handleDownload}
                        busy={busyId !== null}
                        attachmentAllowed={!attachmentBlockMessage}
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
  onDownload,
  busy,
  attachmentAllowed,
}: {
  item: EvidenceItem;
  onStatus: (id: string, status: EvidenceStatus) => void;
  onAttach: (id: string, files: FileList | null) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onDownload: (id: string) => Promise<void>;
  busy: boolean;
  attachmentAllowed: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="sheet px-4 py-4 sm:px-5">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "shrink-0 w-7 h-7 grid place-items-center rounded-ctl border text-sm font-medium num",
            STATUS_STYLES[item.status],
          )}
          aria-hidden
        >
          {STATUS_ICON[item.status]}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[0.9375rem] font-medium leading-snug">{item.title}</p>
            <span className={cn("chip px-1.5 py-0.5 rounded-ctl border", STATUS_STYLES[item.status])}>
              {STATUS_LABEL[item.status]}
            </span>
          </div>

          <p className="mt-1 text-sm text-ink-2 leading-snug">{item.description}</p>
          <p className="mt-1.5 text-xs text-ink-3 leading-snug border-s-2 border-rule-strong ps-3">{item.why}</p>

          {item.attachment && (
            <div className="mt-3 bg-sunk border border-rule px-3 py-2.5 rounded-ctl">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="truncate font-mono text-xs">{item.attachment.name}</span>
                <span className="num text-xs text-ink-3">
                  {(item.attachment.size / 1024).toFixed(0)} KB · {item.attachment.type.split("/")[1]?.toUpperCase() || "FILE"}
                </span>
                {item.attachment.storedLocally && item.attachment.storageKey ? (
                  <span className="text-xs text-done">Stored in this browser</span>
                ) : (
                  <span className="text-xs text-urgent">Record only — file bytes unavailable</span>
                )}
              </div>
              {item.attachment.sha256 && (
                <p className="mt-1.5 break-all font-mono text-[0.6875rem] leading-relaxed text-ink-3" title="SHA-256 integrity fingerprint">
                  SHA-256 {item.attachment.sha256}
                </p>
              )}
              <div className="mt-2 flex items-center gap-3">
                {attachmentAllowed && item.attachment.storedLocally && item.attachment.storageKey && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onDownload(item.id)}
                    className="text-xs text-ink-2 hover:text-ink underline underline-offset-4 disabled:opacity-50"
                  >
                    Download local copy
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onRemove(item.id)}
                  className="ms-auto text-xs text-ink-3 hover:text-urgent underline underline-offset-4 disabled:opacity-50"
                >
                  Remove{busy ? "…" : ""}
                </button>
              </div>
            </div>
          )}

          {item.status === "added" && !item.attachment && (
            <p className="mt-3 text-xs text-ink-3">Marked as held elsewhere; Kavach has no local file for this item.</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {item.status === "missing" && (
              <>
                {attachmentAllowed && (
                  <label className={cn("inline-flex items-center justify-center h-9 px-3 border border-rule-strong rounded-ctl bg-raised hover:border-ink cursor-pointer text-sm transition-colors", busy && "opacity-50 pointer-events-none")}>
                    {busy ? "Storing and fingerprinting…" : "Add evidence"}
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                      className="sr-only"
                      onChange={(e) => {
                        void onAttach(item.id, e.target.files);
                        if (inputRef.current) inputRef.current.value = "";
                      }}
                    />
                  </label>
                )}
                <Button size="sm" variant="secondary" onClick={() => onStatus(item.id, "added")}>
                  Mark held elsewhere
                </Button>
                <button onClick={() => onStatus(item.id, "not_applicable")} className="text-sm text-ink-3 hover:text-ink underline underline-offset-4">
                  Not applicable
                </button>
              </>
            )}

            {item.status === "added" && (
              <>
                {attachmentAllowed && !item.attachment && (
                  <label className={cn("inline-flex items-center justify-center h-9 px-3 border border-rule-strong rounded-ctl bg-raised hover:border-ink cursor-pointer text-sm transition-colors", busy && "opacity-50 pointer-events-none")}>
                    {busy ? "Storing and fingerprinting…" : "Attach file"}
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                      className="sr-only"
                      onChange={(e) => {
                        void onAttach(item.id, e.target.files);
                        if (inputRef.current) inputRef.current.value = "";
                      }}
                    />
                  </label>
                )}
                {attachmentAllowed && item.attachment && (
                  <label className={cn("inline-flex items-center justify-center h-9 px-3 border border-rule-strong rounded-ctl bg-raised hover:border-ink cursor-pointer text-sm transition-colors", busy && "opacity-50 pointer-events-none")}>
                    {busy ? "Storing and fingerprinting…" : "Replace file"}
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                      className="sr-only"
                      onChange={(e) => {
                        void onAttach(item.id, e.target.files);
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
