"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { EMPTY_ENTITIES, type CaseEvent, type CaseFile, type TrackId } from "./types";
import { createDefaultEvidence, ensureEvidence } from "./evidence";
import { deleteEvidenceForCase } from "./evidence-store";
import { isValidPastOrPresentIso } from "./bank-notice";

/**
 * The case file lives in the browser and nowhere else.
 *
 * That is a deliberate choice for a prototype handling fraud narratives: there
 * is no server to breach, and the honesty section says so plainly. The trade-off
 * — no cross-device access, no SMS reminders — is exactly what the "if this were
 * real" note addresses.
 */
import { deleteStoredCase, queueCaseSync, resumeCaseSync } from "./sync";

const KEY = "kavach.cases.v1";
const ACTIVE = "kavach.active.v1";
const DELETED = "kavach.deleted-cases.v1";

const listeners = new Set<() => void>();

/**
 * `useSyncExternalStore` compares snapshots by identity, and `readAll` parses
 * JSON into a fresh array on every call — so an uncached snapshot looks like a
 * change on every render and React loops until it gives up. The cache is
 * invalidated by `emit`, which is exactly when the stored data can differ.
 */
let snapshot: CaseFile[] | null = null;
const EMPTY: CaseFile[] = [];

function emit() {
  snapshot = null;
  for (const l of listeners) l();
}

function migrate(c: CaseFile): CaseFile {
  // Evidence vault was added after launch — old cases must not break.
  if (!c.evidence) return ensureEvidence(c);
  // Also backfill any new templates added later
  return ensureEvidence(c);
}

function readDeletedCaseIds(): Set<string> | null {
  if (typeof window === "undefined") return new Set();
  try {
    const parsed = JSON.parse(localStorage.getItem(DELETED) || "{}") as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return new Set(Object.keys(parsed));
  } catch {
    // A broken deletion ledger must fail closed: otherwise an older tab could
    // recreate a case whose evidence has already been swept.
    return null;
  }
}

function isDeletedCase(id: string): boolean | null {
  const deleted = readDeletedCaseIds();
  return deleted ? deleted.has(id) : null;
}

function readAll(): CaseFile[] {
  if (typeof window === "undefined") return [];
  try {
    const deleted = readDeletedCaseIds();
    if (!deleted) return [];
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]") as CaseFile[];
    return raw.filter((item) => !deleted.has(item.id)).map(migrate);
  } catch {
    return [];
  }
}

function writeAll(cases: CaseFile[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(cases));
    return true;
  } catch {
    // Quota, disabled storage or a non-serialisable value must be visible to
    // the caller. Keeping an in-memory edit alive is not the same as saving it.
    return false;
  }
}

/** KVC-2A7F-4B91: short enough to read down a phone line, clearly not official. */
function makeRef(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const block = (n: number) =>
    Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `KVC-${block(4)}-${block(4)}`;
}

export function newCase(partial: Partial<CaseFile> = {}): CaseFile {
  const now = new Date().toISOString();
  const base: CaseFile = {
    id: crypto.randomUUID(),
    ref: makeRef(),
    createdAt: now,
    language: "en",
    rawStatement: "",
    triage: null,
    entities: { ...EMPTY_ENTITIES },
    txns: [],
    victim: {},
    bank: {},
    suspect: { phones: [], upiIds: [], accounts: [], urls: [], handles: [] },
    evidenceText: "",
    files: [],
    tracks: [],
    docs: {},
    events: [{ at: now, kind: "opened", label: "Case file opened" }],
    evidence: createDefaultEvidence(now),
  };
  const merged = { ...base, ...partial };
  // Respect explicit evidence if caller passed one, otherwise keep default.
  if (!merged.evidence) merged.evidence = base.evidence;
  // Ensure any new templates are present (extensible)
  return ensureEvidence(merged as CaseFile);
}

export function saveCase(c: CaseFile): boolean {
  // A durable deletion marker wins over a stale in-memory tab. Case IDs are
  // UUIDs and are never reused, so keeping the marker is safe and intentional.
  if (isDeletedCase(c.id) !== false) return false;
  const all = readAll();
  const i = all.findIndex((x) => x.id === c.id);
  if (i >= 0) all[i] = c;
  else all.unshift(c);

  // Persist the case before changing the active pointer. If the primary write
  // fails, an existing active case remains intact and callers can warn the
  // citizen instead of navigating as though the case were safe.
  if (!writeAll(all)) return false;

  try {
    localStorage.setItem(ACTIVE, c.id);
  } catch {
    // The case itself is present, but resume/navigation state is incomplete.
    // Report the partial failure and still publish the newly persisted list.
    emit();
    return false;
  }
  // Publish only after both values are current. They form one external store
  // from the UI's point of view, so subscribers never observe a mismatch.
  emit();
  queueCaseSync(c);
  return true;
}

/** Persist an edit to an existing case without rewriting the resume pointer. */
export function saveCaseRecord(c: CaseFile): boolean {
  if (isDeletedCase(c.id) !== false) return false;
  const all = readAll();
  const index = all.findIndex((item) => item.id === c.id);
  // Updates must never recreate a record that another tab has removed.
  if (index < 0) return false;
  all[index] = c;
  if (!writeAll(all)) return false;
  emit();
  queueCaseSync(c);
  return true;
}

export function getCase(id: string): CaseFile | null {
  const found = readAll().find((c) => c.id === id) ?? null;
  return found ? migrate(found) : null;
}

/**
 * Find a case by the reference the citizen was given.
 *
 * The reference is the only handle most people keep — it goes on the complaint,
 * in the documents, and read down a phone line to an officer. Matching is loose
 * on purpose: people write it back without the dashes, in lower case, or with a
 * stray space, and none of that should mean "no such case".
 */
export function findByRef(ref: string): CaseFile | null {
  const want = (ref || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (want.length < 4) return null;
  return readAll().find((c) => c.ref.toUpperCase().replace(/[^A-Z0-9]/g, "") === want) ?? null;
}

export interface DeleteCaseResult {
  recordDeleted: true;
  evidenceCleanup: "complete" | "incomplete";
}

export async function deleteCase(id: string): Promise<DeleteCaseResult> {
  // Persist deletion intent first so another open tab cannot race a stale save
  // against the record removal and recreate a manifest after its blobs are
  // swept. If the record write fails, restore the previous marker state.
  let previousDeletedRaw: string | null;
  try {
    previousDeletedRaw = localStorage.getItem(DELETED);
    const previous = previousDeletedRaw ? JSON.parse(previousDeletedRaw) as Record<string, string> : {};
    if (!previous || typeof previous !== "object" || Array.isArray(previous)) {
      throw new Error("Invalid deletion ledger");
    }
    localStorage.setItem(DELETED, JSON.stringify({ ...previous, [id]: new Date().toISOString() }));
  } catch {
    throw new Error("Could not persist case deletion");
  }

  if (!writeAll(readAll().filter((c) => c.id !== id))) {
    try {
      if (previousDeletedRaw === null) localStorage.removeItem(DELETED);
      else localStorage.setItem(DELETED, previousDeletedRaw);
    } catch {
      // The caller still receives failure and no evidence bytes are touched.
    }
    throw new Error("Could not persist case deletion");
  }
  try {
    if (localStorage.getItem(ACTIVE) === id) localStorage.removeItem(ACTIVE);
  } catch {
    // A stale resume pointer cannot resurrect the removed record. Continue to
    // clean the sensitive bytes and publish the authoritative case list.
  }
  emit();

  // The stored copy has to go too, or "delete this case" only deletes the one
  // the person can see. A network failure here is reported as incomplete
  // cleanup rather than swallowed.
  await deleteStoredCase(id);

  try {
    // Always sweep by case ID, even when the manifest lists no attachment. A
    // previous IndexedDB write followed by a failed manifest save can leave an
    // orphan that only the evidence database knows about.
    await deleteEvidenceForCase(id);
    return { recordDeleted: true, evidenceCleanup: "complete" };
  } catch {
    // Cross-database deletion cannot be atomic in the browser. The record is
    // gone, but callers must disclose that orphaned evidence bytes may remain.
    return { recordDeleted: true, evidenceCleanup: "incomplete" };
  }
}

export function activeCaseId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const id = localStorage.getItem(ACTIVE);
    return id && isDeletedCase(id) === false ? id : null;
  } catch {
    return null;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = () => {
    snapshot = null;
    cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): CaseFile[] {
  if (snapshot === null) snapshot = readAll();
  return snapshot;
}

/** The server has no localStorage, so the same frozen empty array every time. */
function getServerSnapshot(): CaseFile[] {
  return EMPTY;
}

/** The list of cases, kept in sync across tabs. */
/**
 * Retry, once per page, whatever an earlier visit could not push.
 *
 * The lookup is passed in rather than imported by the sync module, so the two
 * files never form a cycle.
 */
let resumed = false;
function resumeSyncOnce(): void {
  if (resumed || typeof window === "undefined") return;
  resumed = true;
  resumeCaseSync(getCase);
}

export function useCases(): CaseFile[] {
  useEffect(resumeSyncOnce, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** The active case is part of the same browser-backed external store. */
export function useActiveCaseId(): string | null {
  return useSyncExternalStore(subscribe, activeCaseId, () => null);
}

/**
 * One case, with a debounced writer. Every edit is persisted — the entire point
 * of the product is that nothing is ever lost to a timeout.
 */
export function useCase(id: string | undefined) {
  const [caseFile, setCaseFile] = useState<CaseFile | null>(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [externalConflict, setExternalConflict] = useState(false);
  const ref = useRef<CaseFile | null>(null);
  const dirty = useRef(false);
  const conflictRef = useRef(false);
  const persistedRevision = useRef<string | null>(null);

  const storageStillMatches = useCallback(() => {
    if (!id || persistedRevision.current === null) return false;
    const stored = getCase(id);
    return Boolean(stored && JSON.stringify(stored) === persistedRevision.current);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    resumeSyncOnce();

    // localStorage is an external system. Read it after hydration and deliver
    // its snapshot through a callback, rather than cascading a state update
    // directly from the effect body.
    queueMicrotask(() => {
      if (cancelled) return;
      if (!id) {
        setReady(true);
        return;
      }
      const c = getCase(id);
      dirty.current = false;
      conflictRef.current = false;
      persistedRevision.current = c ? JSON.stringify(c) : null;
      ref.current = c;
      setCaseFile(c);
      setReady(true);
      setSaving(false);
    });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!caseFile || !dirty.current) return;
    const pendingCase = caseFile;
    const t = setTimeout(() => {
      if (dirty.current && !conflictRef.current && ref.current === pendingCase) {
        if (!storageStillMatches()) {
          conflictRef.current = true;
          setExternalConflict(true);
          setSaveError(false);
          setSaving(false);
          return;
        }
        const ok = saveCaseRecord(pendingCase);
        setSaveError(!ok);
        if (ok) {
          dirty.current = false;
          persistedRevision.current = JSON.stringify(pendingCase);
        }
      }
      setSaving(false);
    }, 250);
    return () => clearTimeout(t);
  }, [caseFile, storageStillMatches]);

  // Storage events fire in the other tabs that share this origin. A deletion
  // clears both the pending writer and its pagehide flush; a remote edit becomes
  // the new local baseline instead of being overwritten by an older snapshot.
  useEffect(() => {
    if (!id) return;
    const syncFromAnotherTab = (event: StorageEvent) => {
      if (event.key !== KEY && event.key !== DELETED) return;
      const stored = getCase(id);
      if (!stored) {
        if (isDeletedCase(id) === true) {
          dirty.current = false;
          conflictRef.current = false;
          persistedRevision.current = null;
          ref.current = null;
          setCaseFile(null);
          setExternalConflict(false);
          setSaving(false);
          setSaveError(false);
        } else if (ref.current) {
          conflictRef.current = true;
          setExternalConflict(true);
          setSaving(false);
        }
        return;
      }

      const incomingRevision = JSON.stringify(stored);
      if (dirty.current) {
        // An unrelated case write still rewrites the shared array. If our own
        // persisted record is unchanged, keep the 250ms local edit pending.
        if (incomingRevision === persistedRevision.current) return;
        conflictRef.current = true;
        setExternalConflict(true);
        setSaving(false);
        setSaveError(false);
        return;
      }

      conflictRef.current = false;
      persistedRevision.current = incomingRevision;
      ref.current = stored;
      setCaseFile(stored);
      setExternalConflict(false);
      setSaving(false);
      setSaveError(false);
    };
    window.addEventListener("storage", syncFromAnotherTab);
    return () => window.removeEventListener("storage", syncFromAnotherTab);
  }, [id]);

  // A closing tab must not lose the last 250ms of typing.
  useEffect(() => {
    const flush = () => {
      if (
        dirty.current
        && !conflictRef.current
        && ref.current
        && storageStillMatches()
        && saveCaseRecord(ref.current)
      ) {
        dirty.current = false;
        persistedRevision.current = JSON.stringify(ref.current);
      }
    };
    window.addEventListener("pagehide", flush);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
    };
  }, [storageStillMatches]);

  const update = useCallback((patch: Partial<CaseFile> | ((c: CaseFile) => Partial<CaseFile>)) => {
    if (!ref.current) return;
    setSaving(true);
    setCaseFile((prev) => {
      if (!prev) return prev;
      const p = typeof patch === "function" ? patch(prev) : patch;
      const next = { ...prev, ...p };
      dirty.current = true;
      ref.current = next;
      return next;
    });
  }, []);

  /**
   * Evidence uses this synchronous record commit between its IndexedDB steps.
   * The UI state changes only when the manifest is durably written.
   */
  const persistUpdate = useCallback((patch: (c: CaseFile) => CaseFile): boolean => {
    const current = ref.current;
    if (!current || conflictRef.current) return false;
    if (!storageStillMatches()) {
      conflictRef.current = true;
      setExternalConflict(true);
      setSaveError(false);
      setSaving(false);
      return false;
    }
    const next = patch(current);
    if (!saveCaseRecord(next)) {
      setSaveError(true);
      return false;
    }
    dirty.current = false;
    persistedRevision.current = JSON.stringify(next);
    ref.current = next;
    setCaseFile(next);
    setSaving(false);
    setSaveError(false);
    return true;
  }, [storageStillMatches]);

  const addEvent = useCallback(
    (kind: CaseEvent["kind"], label: string) => {
      update((c) => ({ events: [...c.events, { at: new Date().toISOString(), kind, label }] }));
    },
    [update],
  );

  const toggleTrack = useCallback(
    (trackId: TrackId, done: boolean, extra?: { ref?: string; note?: string; doneAt?: string }) => {
      // This timestamp is a legal trigger supplied by the citizen, not an
      // interaction timestamp. Refuse to silently substitute the click time.
      if (trackId === "bank-notice" && done && !isValidPastOrPresentIso(extra?.doneAt)) return;

      update((c) => {
        const tracks = c.tracks.filter((t) => t.id !== trackId);
        const completedAt = extra?.doneAt ?? new Date().toISOString();
        if (done) {
          tracks.push({ id: trackId, ...extra, doneAt: completedAt });
        }
        // The bank-complaint date anchors the conditional RBI 10/90-day tracks
        // and the Ombudsman's separate opening and filing-window calculation.
        const bank =
          trackId === "bank-notice"
            ? { ...c.bank, notifiedAt: done ? completedAt : undefined, ...(extra?.ref ? { ackRef: extra.ref } : {}) }
            : c.bank;
        return {
          tracks,
          bank,
          events: [
            ...c.events,
            { at: new Date().toISOString(), kind: "track" as const, label: `${trackId} marked ${done ? "done" : "not done"}` },
          ],
        };
      });
    },
    [update],
  );

  const retrySave = useCallback(() => {
    if (!ref.current || conflictRef.current) return;
    if (!storageStillMatches()) {
      conflictRef.current = true;
      setExternalConflict(true);
      setSaveError(false);
      return;
    }
    setSaving(true);
    const ok = saveCaseRecord(ref.current);
    setSaveError(!ok);
    if (ok) {
      dirty.current = false;
      persistedRevision.current = JSON.stringify(ref.current);
    }
    setSaving(false);
  }, [storageStillMatches]);

  const resolveExternalConflict = useCallback((choice: "keep-local" | "load-stored") => {
    const current = ref.current;
    if (choice === "keep-local" && current) {
      const ok = saveCaseRecord(current);
      setSaveError(!ok);
      if (!ok) return;
      dirty.current = false;
      persistedRevision.current = JSON.stringify(current);
    } else {
      const stored = id ? getCase(id) : null;
      dirty.current = false;
      persistedRevision.current = stored ? JSON.stringify(stored) : null;
      ref.current = stored;
      setCaseFile(stored);
      setSaveError(false);
    }
    conflictRef.current = false;
    setExternalConflict(false);
    setSaving(false);
  }, [id]);

  const deleteCurrentCase = useCallback(async () => {
    if (!id || !ref.current) throw new Error("No current case to delete");
    const current = ref.current;
    // Suppress the debounce/pagehide writers while the two local stores are
    // removed, otherwise navigation could resurrect the deleted case.
    ref.current = null;
    dirty.current = false;
    conflictRef.current = false;
    try {
      const result = await deleteCase(id);
      setSaving(false);
      setSaveError(false);
      return result;
    } catch (error) {
      ref.current = current;
      dirty.current = true;
      throw error;
    }
  }, [id]);

  return {
    caseFile,
    ready,
    saving,
    saveError,
    externalConflict,
    retrySave,
    resolveExternalConflict,
    update,
    persistUpdate,
    addEvent,
    toggleTrack,
    deleteCurrentCase,
  };
}
