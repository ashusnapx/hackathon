"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ruleDocs } from "@/lib/ai/fallback";
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
  /**
   * Write the letters.
   *
   * `immediate` fills the case with the rule-written versions first and then
   * upgrades them — see the note below. The documents screen passes false: it
   * has a visible button, somebody pressed it deliberately, and replacing a set
   * they are reading with a rougher one and then a better one would be worse
   * than a moment's wait.
   */
  generate: (immediate?: boolean) => Promise<void>;
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

  const generate = useCallback(async (immediate = false) => {
    const mine = ++sequence.current;
    const requestedKeys = applicableDocumentKeys(caseFile);
    const fingerprint = documentInputFingerprint(caseFile);
    setBusy(true);
    setError(null);

    /*
     * The letter, now, before anybody waits for a model.
     *
     * `ruleDocs` is deterministic and runs here in the browser, so a complete,
     * sendable version of every document exists the instant it is asked for.
     * The model call then runs behind it and quietly replaces the text if it
     * comes back with something better.
     *
     * This is what the fallback was always for — its own comment says
     * "somebody filing at 2am on a patchy connection should still walk away
     * with a filled-in complaint" — and it was reachable only from the server,
     * only after the model had spent its thirty-second timeout failing. On a
     * rate-limited key that meant half a minute of spinner before the thing we
     * could have produced instantly appeared anyway.
     *
     * The fingerprint deliberately excludes `docs`, so writing these does not
     * invalidate the request already in flight for the same facts.
     */
    if (immediate) {
      update((c) => ({
        docs: {
          ...ruleDocs(caseFile),
          generatedAt: new Date().toISOString(),
          generatedBy: "rules" as const,
          translated: {},
          translatedLanguage: undefined,
        },
        events: [
          ...c.events,
          { at: new Date().toISOString(), kind: "docs" as const, label: "Documents drafted" },
        ],
      }));
    }

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
      // With the rule-written set already in the case there is nothing to
      // recover from and nothing to tell anybody: they have their letter, it
      // is simply the plain one. Only a failure with nothing behind it is
      // worth interrupting somebody for.
      if (mine === sequence.current && !immediate) setError("doc.err.generate");
    } finally {
      if (mine === sequence.current) setBusy(false);
    }
  }, [caseFile, update]);

  return { generate, busy, error, clearError: () => setError(null) };
}
