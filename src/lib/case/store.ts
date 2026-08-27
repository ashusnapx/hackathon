"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { EMPTY_ENTITIES, type CaseEvent, type CaseFile, type TrackId } from "./types";

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
function emit() {
  for (const l of listeners) l();
}

function readAll(): CaseFile[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as CaseFile[];
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
  return {
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
    ...partial,
  };
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
  return readAll().find((c) => c.id === id) ?? null;
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
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/** The list of cases, kept in sync across tabs. */
export function useCases(): CaseFile[] {
  return useSyncExternalStore(subscribe, readAll, () => []);
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
