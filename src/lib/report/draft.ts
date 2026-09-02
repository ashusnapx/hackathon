"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Stage } from "./schema";

/**
 * Draft persistence for the complaint form.
 *
 * The single most reported failure of the live portal is losing a part-finished
 * complaint: the OTP expires after thirty minutes, nothing is saved as you go,
 * and a form of roughly forty fields is gone. People describe filing eight
 * times and giving up.
 *
 * So this module has one job and treats it as a correctness problem rather than
 * a nicety. Every change is written locally. Nothing is held only in React
 * state. Writes are debounced for typing but forced on the events that actually
 * precede data loss — tab hidden, page unloaded, connection dropped — because a
 * debounce timer does not survive the process being killed.
 */

const KEY = "kavach.report.draft.v1";
const QUEUE = "kavach.report.queue.v1";
const DEBOUNCE_MS = 400;

export interface SuspectId {
  kind: string;
  value: string;
}

export interface ReportDraft {
  id: string;
  startedAt: string;
  updatedAt: string;
  stage: Stage;

  // Incident
  narrative: string;
  categoryId?: string;
  subcategoryId?: string;
  incidentAt?: string;
  delayReason?: string;
  platform?: string;
  amount?: number;
  /** Kept so we can show what was inferred versus what the citizen corrected. */
  inferred?: { categoryId?: string; subcategoryId?: string; incidentAt?: string; amount?: number; confidence?: number };

  // Evidence
  pastedText: string;
  files: { name: string; size: number; type: string; compressedFrom?: number }[];

  // Suspect
  suspectName?: string;
  suspectIds: SuspectId[];
  suspectAddress?: string;

  // Complainant
  name?: string;
  mobile?: string;
  email?: string;
  gender?: string;
  dob?: string;
  guardianName?: string;
  relationship?: string;
  nationality?: string;
  address?: string;
  state?: string;
  district?: string;
  policeStation?: string;
  pincode?: string;

  submittedAt?: string;
  acknowledgement?: string;
}

export function emptyDraft(): ReportDraft {
  const now = new Date().toISOString();
  return {
    id: (globalThis.crypto?.randomUUID?.() ?? String(Date.now())),
    startedAt: now,
    updatedAt: now,
    stage: "incident",
    narrative: "",
    pastedText: "",
    files: [],
    suspectIds: [],
    nationality: "India",
  };
}

function read(): ReportDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as ReportDraft;
    // A draft written by an older shape should degrade, not throw on read.
    return d && typeof d === "object" && typeof d.narrative === "string" ? { ...emptyDraft(), ...d } : null;
  } catch {
    return null;
  }
}

type SaveState = "idle" | "saving" | "saved" | "error";

function write(d: ReportDraft): SaveState {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
    return "saved";
  } catch {
    // Quota, private mode, or a locked-down browser. The session keeps working
    // in memory; we tell the truth in the interface rather than silently
    // pretending the draft is safe.
    return "error";
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing we can do, and nothing worth breaking the flow over */
  }
}

export function hasDraft(): boolean {
  const d = read();
  return Boolean(d && !d.submittedAt && (d.narrative.trim() || d.name || d.mobile));
}

export interface DraftApi {
  draft: ReportDraft;
  patch: (p: Partial<ReportDraft>) => void;
  /** Write immediately rather than waiting for the debounce. */
  flush: () => void;
  reset: () => void;
  saveState: SaveState;
  savedAt: Date | null;
  /** True until the first read from storage, so we never flash an empty form. */
  hydrating: boolean;
}

export function useDraft(): DraftApi {
  const [draft, setDraft] = useState<ReportDraft>(emptyDraft);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [hydrating, setHydrating] = useState(true);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<ReportDraft | null>(null);

  // Reading storage has to happen after hydration: the server cannot see the
  // draft, so seeding it in a lazy initialiser would make the first client
  // render disagree with the HTML. `hydrating` covers the one frame in between.
  useEffect(() => {
    const existing = read();
    if (existing && !existing.submittedAt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(existing);
      setSavedAt(new Date(existing.updatedAt));
      setSaveState("saved");
    }
    setHydrating(false);
  }, []);

  const commit = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const d = pending.current;
    if (!d) return;
    pending.current = null;
    const state = write(d);
    setSaveState(state);
    if (state === "saved") setSavedAt(new Date());
  }, []);

  const patch = useCallback(
    (p: Partial<ReportDraft>) => {
      setDraft((prev) => {
        const next = { ...prev, ...p, updatedAt: new Date().toISOString() };
        pending.current = next;
        setSaveState("saving");
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          const d = pending.current;
          if (!d) return;
          pending.current = null;
          timer.current = null;
          const state = write(d);
          setSaveState(state);
          if (state === "saved") setSavedAt(new Date());
        }, DEBOUNCE_MS);
        return next;
      });
    },
    [],
  );

  // The events that actually precede losing the tab. A debounce timer does not
  // survive any of them, so each one forces the write synchronously.
  useEffect(() => {
    const force = () => commit();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") commit();
    };
    window.addEventListener("pagehide", force);
    window.addEventListener("beforeunload", force);
    window.addEventListener("offline", force);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", force);
      window.removeEventListener("beforeunload", force);
      window.removeEventListener("offline", force);
      document.removeEventListener("visibilitychange", onVisibility);
      commit();
    };
  }, [commit]);

  const reset = useCallback(() => {
    clearDraft();
    pending.current = null;
    setDraft(emptyDraft());
    setSavedAt(null);
    setSaveState("idle");
  }, []);

  return useMemo(
    () => ({ draft, patch, flush: commit, reset, saveState, savedAt, hydrating }),
    [draft, patch, commit, reset, saveState, savedAt, hydrating],
  );
}

// ── Connectivity ────────────────────────────────────────────────────────────

export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  return online;
}

// ── Outbox ──────────────────────────────────────────────────────────────────

/**
 * A complaint submitted with no connection is not an error, it is a complaint
 * waiting for a signal. It goes to a durable outbox and leaves on reconnect,
 * which is the difference between "try again later" and being filed.
 */
export function queueSubmission(d: ReportDraft) {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE) || "[]") as ReportDraft[];
    q.push(d);
    localStorage.setItem(QUEUE, JSON.stringify(q));
  } catch {
    /* the caller surfaces the failure */
  }
}

export function pendingSubmissions(): ReportDraft[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE) || "[]") as ReportDraft[];
  } catch {
    return [];
  }
}

export function dropSubmission(id: string) {
  try {
    const q = pendingSubmissions().filter((d) => d.id !== id);
    localStorage.setItem(QUEUE, JSON.stringify(q));
  } catch {
    /* ignore */
  }
}

/**
 * Acknowledgement numbers are shaped like the portal's fourteen digits so the
 * flow is realistic, and prefixed so nobody can mistake one for the real thing.
 */
export function mockAcknowledgement(): string {
  const n = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");
  return `KV${n}`;
}
