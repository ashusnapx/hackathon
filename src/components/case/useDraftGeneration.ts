"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  applicableDocumentKeys,
  documentInputFingerprint,
  parseDraftResponse,
} from "@/lib/case/documents";
import type { DictKey } from "@/lib/i18n/dict/en";
import type { CaseDocs, CaseFile } from "@/lib/case/types";

/**
 * Writing the case's letters, from wherever somebody asked for them.
 *
 * Lifted out of `DocumentsPanel` when the letter modal needed it too. It had
 * been the documents screen's private business, which is why the modal opened
 * over a step could only ever *show* a draft that already existed — and on a
 * case where nobody had pressed generate yet, that meant the modal did not
 * open at all and the step sent the person away to another screen to find the
 * button. Two copies of this would have drifted; the staleness rules below are
 * exactly the kind of thing that gets fixed in one copy and not the other.
 *
 * ── The two guards, and why a letter needs them ─────────────────────────────
 *
 * A sequence number, so a slow first request cannot overwrite a fast second
 * one. And a fingerprint of the inputs, so a draft written from facts the
 * person has since corrected is discarded rather than saved: these documents
 * are sent to a bank and a police station, and a letter quoting an amount its
 * owner has already fixed is worse than no letter.
 */
export interface DraftGeneration {
  generate: () => Promise<void>;
  busy: boolean;
  /** A translation key, so the caller decides how loudly to say it. */
  error: DictKey | null;
  clearError: () => void;
}

export function useDraftGeneration(
  caseFile: CaseFile,
  update: (patch: Partial<CaseFile> | ((c: CaseFile) => Partial<CaseFile>)) => void,
): DraftGeneration {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<DictKey | null>(null);
  const sequence = useRef(0);
  const latest = useRef(caseFile);

  useEffect(() => {
    latest.current = caseFile;
  }, [caseFile]);

  const generate = useCallback(async () => {
    const mine = ++sequence.current;
    const requestedKeys = applicableDocumentKeys(caseFile);
    const fingerprint = documentInputFingerprint(caseFile);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseFile }),
      });
      if (!res.ok) throw new Error(`draft-${res.status}`);
      const data = parseDraftResponse(await res.json(), requestedKeys);
      if (!data) throw new Error("invalid-draft-response");

      if (mine !== sequence.current || documentInputFingerprint(latest.current) !== fingerprint) {
        setError("doc.err.stale");
        return;
      }

      update((c) => ({
        docs: {
          ...(data.docs as CaseDocs),
          generatedAt: new Date().toISOString(),
          generatedBy: data.source,
          // A regenerate invalidates the old translations rather than leaving a
          // stale vernacular copy next to fresh English.
          translated: {},
          translatedLanguage: undefined,
        },
        events: [
          ...c.events,
          { at: new Date().toISOString(), kind: "docs" as const, label: "Documents generated" },
        ],
      }));
    } catch {
      if (mine === sequence.current) setError("doc.err.generate");
    } finally {
      if (mine === sequence.current) setBusy(false);
    }
  }, [caseFile, update]);

  return { generate, busy, error, clearError: () => setError(null) };
}
