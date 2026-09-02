"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { EMPTY_ENTITIES, type CaseEvent, type CaseFile, type TrackId } from "./types";
import { createDefaultEvidence, ensureEvidence } from "./evidence";

/**
 * The case file lives in the browser and nowhere else.
 *
 * That is a deliberate choice for a prototype handling fraud narratives: there
 * is no server to breach, and the honesty section says so plainly. The trade-off
 * — no cross-device access, no SMS reminders — is exactly what the "if this were
 * real" note addresses.
 */
const KEY = "kavach.cases.v1";
const ACTIVE = "kavach.active.v1";

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

function readAll(): CaseFile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]") as CaseFile[];
    return raw.map(migrate);
  } catch {
    return [];
  }
}

function writeAll(cases: CaseFile[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cases));
  } catch {
    /* quota or private mode — the session keeps working, it just will not persist */
  }
  emit();
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

export function saveCase(c: CaseFile) {
  const all = readAll();
  const i = all.findIndex((x) => x.id === c.id);
  if (i >= 0) all[i] = c;
  else all.unshift(c);
  writeAll(all);
  try {
    localStorage.setItem(ACTIVE, c.id);
  } catch {
    /* ignore */
  }
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

export function deleteCase(id: string) {
  writeAll(readAll().filter((c) => c.id !== id));
  if (localStorage.getItem(ACTIVE) === id) localStorage.removeItem(ACTIVE);
}

export function activeCaseId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE);
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
export function useCases(): CaseFile[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * One case, with a debounced writer. Every edit is persisted — the entire point
 * of the product is that nothing is ever lost to a timeout.
 */
export function useCase(id: string | undefined) {
  const [caseFile, setCaseFile] = useState<CaseFile | null>(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<CaseFile | null>(null);

  useEffect(() => {
    if (!id) {
      setReady(true);
      return;
    }
    const c = getCase(id);
    ref.current = c;
    setCaseFile(c);
    setReady(true);
  }, [id]);

  useEffect(() => {
    if (!caseFile) return;
    setSaving(true);
    const t = setTimeout(() => {
      saveCase(caseFile);
      setSaving(false);
    }, 250);
    return () => clearTimeout(t);
  }, [caseFile]);

  // A closing tab must not lose the last 250ms of typing.
  useEffect(() => {
    const flush = () => {
      if (ref.current) saveCase(ref.current);
    };
    window.addEventListener("pagehide", flush);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  const update = useCallback((patch: Partial<CaseFile> | ((c: CaseFile) => Partial<CaseFile>)) => {
    setCaseFile((prev) => {
      if (!prev) return prev;
      const p = typeof patch === "function" ? patch(prev) : patch;
      const next = { ...prev, ...p };
      ref.current = next;
      return next;
    });
  }, []);

  const addEvent = useCallback(
    (kind: CaseEvent["kind"], label: string) => {
      update((c) => ({ events: [...c.events, { at: new Date().toISOString(), kind, label }] }));
    },
    [update],
  );

  const toggleTrack = useCallback(
    (trackId: TrackId, done: boolean, extra?: { ref?: string; note?: string }) => {
      update((c) => {
        const tracks = c.tracks.filter((t) => t.id !== trackId);
        if (done) {
          tracks.push({ id: trackId, doneAt: new Date().toISOString(), ...extra });
        }
        // Completing the bank notice is what starts the 10, 30 and 90 day clocks.
        const bank =
          trackId === "bank-notice"
            ? { ...c.bank, notifiedAt: done ? new Date().toISOString() : undefined, ...(extra?.ref ? { ackRef: extra.ref } : {}) }
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

  return { caseFile, ready, saving, update, addEvent, toggleTrack };
}
