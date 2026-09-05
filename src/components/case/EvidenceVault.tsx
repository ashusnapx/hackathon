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
  type EvidenceFileError,
  type EvidenceItem,
  type EvidenceStatus,
} from "@/lib/case/evidence";
import {
  getStoredEvidenceFile,
  removeStoredEvidenceFile,
  storeEvidenceFile,
  withEvidenceCaseLock,
} from "@/lib/case/evidence-store";
import { useT } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dict/en";
import { cn } from "@/lib/utils";

interface Props {
  caseFile: CaseFile;
  update: (patch: Partial<CaseFile> | ((c: CaseFile) => Partial<CaseFile>)) => void;
  persistUpdate: (patch: (c: CaseFile) => CaseFile) => boolean;
}

const CATEGORY_LABEL: Record<string, DictKey> = {
  transaction: "ev.cat.transaction",
  communication: "ev.cat.communication",
  complaint: "ev.cat.complaint",
};

const CATEGORY_ORDER: Array<EvidenceItem["category"]> = ["transaction", "communication", "complaint"];

const STATUS_STYLES: Record<EvidenceStatus, string> = {
  added: "bg-done-soft text-done border-done/25",
  missing: "bg-urgent-soft text-urgent-ink border-urgent/30",
  not_applicable: "bg-sunk text-ink-3 border-rule",
};

const STATUS_LABEL: Record<EvidenceStatus, DictKey> = {
  added: "ev.status.added",
  missing: "ev.status.missing",
  not_applicable: "ev.status.not_applicable",
};

const STATUS_ICON: Record<EvidenceStatus, string> = {
  added: "✓",
  missing: "○",
  not_applicable: "—",
};

const FILE_ERROR_KEY: Record<EvidenceFileError, DictKey> = {
  "ev-file-type": "ev.err.type",
  "ev-file-size": "ev.err.size",
  "ev-file-empty": "ev.err.empty",
};

/** Errors are stored as dictionary keys so the banner follows the language. */
function toErrKey(cause: unknown, fallback: DictKey): DictKey {
  if (cause instanceof Error && cause.message.startsWith("ev.")) return cause.message as DictKey;
  return fallback;
}

export function EvidenceVault({ caseFile, update, persistUpdate }: Props) {
  const t = useT();
  /** Catalogue copy (title/description/why) in the active language. Stored
      cases keep English-era copies, but the id is stable so the dictionary
      always wins — with the stored copy as the last-resort fallback. */
  const tpl = (id: string, field: "title" | "description" | "why", fallback: string) => {
    const s = t(`ev.tpl.${id}.${field}` as DictKey);
    return s === `ev.tpl.${id}.${field}` ? fallback : s;
  };
  const evidence = getEvidence(caseFile);
  const readiness = calculateReadiness(caseFile);
  const attachmentBlockReason = evidenceAttachmentBlockReason(caseFile);
  const attachmentBlockMessage = attachmentBlockReason === "child-sexual-content-risk"
    ? t("ev.block.child")
    : attachmentBlockReason === "intimate-content-risk"
      ? t("ev.block.intimate")
      : null;
  const [openCategory, setOpenCategory] = useState<EvidenceItem["category"] | null>("transaction");
  const [error, setError] = useState<DictKey | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const operationInFlight = useRef(false);

  const tone =
    readiness.level === "READY" ? "bg-done" : readiness.level === "PARTIALLY_READY" ? "bg-wait" : "bg-urgent";

  const levelKey: DictKey =
    readiness.counts.totalApplicable === 0
      ? "ev.noApplicable"
      : readiness.level === "READY"
      ? "ev.mostAddressed"
      : readiness.level === "PARTIALLY_READY"
        ? "ev.inProgress"
        : "ev.justStarted";

  const handleStatus = (id: string, status: EvidenceStatus) => {
    update((c) => setEvidenceStatus(c, id, status));
    setError(null);
  };

  const handleAttach = async (id: string, files: FileList | null) => {
    if (!files?.length || operationInFlight.current) return;
    if (attachmentBlockMessage) {
      setError(attachmentBlockReason === "child-sexual-content-risk" ? "ev.block.child" : "ev.block.intimate");
      return;
    }
    const f = files[0];
    const err = validateEvidenceFile(f);
    if (err) {
      setError(FILE_ERROR_KEY[err]);
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
          throw new Error(orphaned ? "ev.err.orphanNew" : "ev.err.link");
        }
        if (replaced.storageKey && replaced.storageKey !== stored.storageKey) {
          try {
            await removeStoredEvidenceFile(replaced.storageKey);
          } catch {
            setError("ev.err.orphanOld");
          }
        }
      });
    } catch (cause) {
      setError(toErrKey(cause, "ev.err.store"));
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
          throw new Error("ev.err.removeKept");
        }
        const removedAttachment = removed.attachment;
        if (removedAttachment?.storageKey && removedAttachment.storedLocally) {
          try {
            await removeStoredEvidenceFile(removedAttachment.storageKey);
          } catch {
            setError("ev.err.removeBytes");
          }
        }
      });
    } catch (cause) {
      setError(toErrKey(cause, "ev.err.removeLocal"));
    } finally {
      operationInFlight.current = false;
      setBusyId(null);
    }
  };

  const handleDownload = async (id: string) => {
    if (operationInFlight.current) return;
    if (attachmentBlockMessage) {
      setError(attachmentBlockReason === "child-sexual-content-risk" ? "ev.block.child" : "ev.block.intimate");
      return;
    }
    const attachment = evidence.find((item) => item.id === id)?.attachment;
    if (!attachment?.storageKey || !attachment.storedLocally) {
      setError("ev.err.recordOnly");
      return;
    }
    operationInFlight.current = true;
    setBusyId(id);
    setError(null);
    try {
      const stored = await getStoredEvidenceFile(attachment.storageKey);
      if (!stored) throw new Error("ev.err.gone");
      const href = URL.createObjectURL(stored.blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = stored.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(href), 1_000);
    } catch (cause) {
      setError(toErrKey(cause, "ev.err.open"));
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
          <p className="label">{t("ev.mapTitle")}</p>
          <p className="num text-2xl font-medium">{readiness.percentage}% {t("ev.checklistCoverage")}</p>
        </div>

        <div
          className="mt-3 h-1.5 bg-sunk rounded-full overflow-hidden"
          role="progressbar"
          aria-label={t("ev.coverageAria")}
          aria-valuenow={readiness.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className={cn("h-full rounded-full transition-[width] duration-500", tone)} style={{ width: `${readiness.percentage}%` }} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className={cn("chip px-2 py-1 rounded-ctl border", STATUS_STYLES[readiness.level === "READY" ? "added" : readiness.level === "PARTIALLY_READY" ? "not_applicable" : "missing"])}>
            {t(levelKey)}
          </span>
          <span className="text-sm text-ink-3">
            {readiness.counts.added} {t("ev.markedHeld")} · {readiness.counts.storedLocally} {t("ev.localFiles")} · {readiness.counts.missing} {t("ev.missingN")} · {readiness.counts.notApplicable} {t("ev.naN")}
          </span>
        </div>

        <p className="mt-3 text-sm text-ink-2 leading-snug">
          {t("ev.preserveNote")}
        </p>

        {readiness.recommendations.length > 0 && (
          <div className="mt-4 border-t border-rule pt-4">
            <p className="label">{t("ev.recommendedNext")}</p>
            <ol className="mt-2 space-y-1.5">
              {readiness.recommendations.map((item) => (
                <li key={item.id} className="text-sm text-ink-2 flex gap-2">
                  <span aria-hidden>•</span>
                  <span>{tpl(item.id, "title", item.title)}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <p className="mt-4 text-xs text-ink-3 border-s-2 border-rule-strong ps-3">
          {t("ev.storageNote")}
        </p>

        {attachmentBlockMessage && (
          <p role="alert" className="mt-4 text-sm leading-snug text-urgent bg-urgent-soft border border-urgent/20 px-3 py-3 rounded-ctl">
            {attachmentBlockMessage}
          </p>
        )}
      </section>

      {/* Generate summary */}
      <section className="sheet px-5 py-5">
        <p className="label">{t("ev.manifestTitle")}</p>
        <p className="mt-2 text-[0.9375rem] text-ink-2 leading-snug max-w-xl">
          {t("ev.manifestBody")}
        </p>
        <div className="mt-4">
          <Button onClick={() => downloadEvidenceSummary(caseFile)} size="sm">
            {t("ev.generateSummary")}
          </Button>
        </div>
      </section>

      {/* Checklist grouped */}
      <section>
        <h2 className="text-2xl">{t("ev.checklistH2")}</h2>
        <p className="mt-1.5 text-[0.9375rem] text-ink-2 max-w-xl">
          {t("ev.checklistSub")}
        </p>

        {error && (
          <p role="alert" className="mt-4 text-sm text-urgent bg-urgent-soft border border-urgent/20 px-3 py-2 rounded-ctl">{t(error)}</p>
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
                  <span className="flex-1 text-lg">{t(CATEGORY_LABEL[cat])}</span>
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
                        tpl={tpl}
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
  tpl,
  onStatus,
  onAttach,
  onRemove,
  onDownload,
  busy,
  attachmentAllowed,
}: {
  item: EvidenceItem;
  tpl: (id: string, field: "title" | "description" | "why", fallback: string) => string;
  onStatus: (id: string, status: EvidenceStatus) => void;
  onAttach: (id: string, files: FileList | null) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onDownload: (id: string) => Promise<void>;
  busy: boolean;
  attachmentAllowed: boolean;
}) {
  const t = useT();
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
            <p className="text-[0.9375rem] font-medium leading-snug">{tpl(item.id, "title", item.title)}</p>
            <span className={cn("chip px-1.5 py-0.5 rounded-ctl border", STATUS_STYLES[item.status])}>
              {t(STATUS_LABEL[item.status])}
            </span>
          </div>

          <p className="mt-1 text-sm text-ink-2 leading-snug">{tpl(item.id, "description", item.description)}</p>
          <p className="mt-1.5 text-xs text-ink-3 leading-snug border-s-2 border-rule-strong ps-3">{tpl(item.id, "why", item.why)}</p>

          {item.attachment && (
            <div className="mt-3 bg-sunk border border-rule px-3 py-2.5 rounded-ctl">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="truncate font-mono text-xs">{item.attachment.name}</span>
                <span className="num text-xs text-ink-3">
                  {(item.attachment.size / 1024).toFixed(0)} KB · {item.attachment.type.split("/")[1]?.toUpperCase() || "FILE"}
                </span>
                {item.attachment.storedLocally && item.attachment.storageKey ? (
                  <span className="text-xs text-done">{t("ev.storedLocal")}</span>
                ) : (
                  <span className="text-xs text-urgent">{t("ev.recordOnly")}</span>
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
                    {t("ev.downloadCopy")}
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onRemove(item.id)}
                  className="ms-auto text-xs text-ink-3 hover:text-urgent underline underline-offset-4 disabled:opacity-50"
                >
                  {t("ev.remove")}{busy ? "…" : ""}
                </button>
              </div>
            </div>
          )}

          {item.status === "added" && !item.attachment && (
            <p className="mt-3 text-xs text-ink-3">{t("ev.heldElsewhere")}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {item.status === "missing" && (
              <>
                {attachmentAllowed && (
                  <label className={cn("inline-flex items-center justify-center h-9 px-3 border border-rule-strong rounded-ctl bg-raised hover:border-ink cursor-pointer text-sm transition-colors", busy && "opacity-50 pointer-events-none")}>
                    {busy ? t("ev.storing") : t("ev.addEvidence")}
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
                  {t("ev.markHeld")}
                </Button>
                <button onClick={() => onStatus(item.id, "not_applicable")} className="text-sm text-ink-3 hover:text-ink underline underline-offset-4">
                  {t("ev.status.not_applicable")}
                </button>
              </>
            )}

            {item.status === "added" && (
              <>
                {attachmentAllowed && !item.attachment && (
                  <label className={cn("inline-flex items-center justify-center h-9 px-3 border border-rule-strong rounded-ctl bg-raised hover:border-ink cursor-pointer text-sm transition-colors", busy && "opacity-50 pointer-events-none")}>
                    {busy ? t("ev.storing") : t("ev.attachFile")}
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
                    {busy ? t("ev.storing") : t("ev.replaceFile")}
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
                  {t("ev.markMissing")}
                </button>
                <button onClick={() => onStatus(item.id, "not_applicable")} className="text-sm text-ink-3 hover:text-ink underline underline-offset-4">
                  {t("ev.status.not_applicable")}
                </button>
              </>
            )}

            {item.status === "not_applicable" && (
              <button onClick={() => onStatus(item.id, "missing")} className="text-sm text-ink-3 hover:text-ink underline underline-offset-4">
                {t("ev.change")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
