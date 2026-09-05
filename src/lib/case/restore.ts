"use client";

import { useEffect, useState } from "react";
import { getCase, saveCase } from "./store";
import { readCaseKey, rememberCaseKey, takeKeyFromLocation } from "./key";
import { adoptRevision, fetchStoredCase, isSyncable, localRevision } from "./sync";
import { DEMO_CASE_ID } from "@/lib/demo/id";
import { ensureDemoCase } from "@/lib/demo/case";

/**
 * Make a case exist on this device before anything tries to read it.
 *
 * Three situations arrive at the same URL. The sample case is built from the
 * repository. A case this browser already has is opened as it always was. And a
 * case opened from a link — the one in the email, on a phone that has never
 * seen it — is pulled from storage using the key in the link's fragment.
 *
 * It resolves before the case screen mounts, rather than racing it, because the
 * alternative is showing somebody "case not found" for the fraction of a second
 * before their case appears. For a person who has just been defrauded, that is
 * not a flicker; it is a heart attack.
 */
export type RestoreState = "checking" | "done";

export function useCaseRestore(id: string | undefined): RestoreState {
  const [state, setState] = useState<RestoreState>("checking");

  useEffect(() => {
    let cancelled = false;
    const finish = () => { if (!cancelled) setState("done"); };

    if (!id) {
      finish();
      return;
    }

    if (id === DEMO_CASE_ID) {
      ensureDemoCase();
      finish();
      return;
    }

    // Always first: it takes the key out of the address bar, where it would
    // otherwise sit in screenshots, bookmarks and shared-screen recordings.
    const fromLink = takeKeyFromLocation();
    if (fromLink) rememberCaseKey(id, fromLink);

    const key = fromLink ?? readCaseKey(id);
    const local = getCase(id);
    if (!key || !isSyncable(id)) {
      finish();
      return;
    }

    void (async () => {
      const stored = await fetchStoredCase(id, key);
      if (cancelled) return;
      // A newer copy means the person edited this case somewhere else. Local
      // edits made since are not merged — the last write is what stands, which
      // is the same rule the database applies.
      if (stored && (!local || stored.revision > localRevision(id))) {
        if (saveCase(stored.caseFile)) adoptRevision(id, stored.revision);
      }
      finish();
    })();

    return () => { cancelled = true; };
  }, [id]);

  return state;
}
