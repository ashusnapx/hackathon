import { useSyncExternalStore } from "react";
import type { CaseFile } from "./types";
import { ensureCaseKey, forgetCaseKey, readCaseKey } from "./key";
import { DEMO_CASE_ID } from "@/lib/demo/id";

/**
 * Keeping a case reachable from more than one device.
 *
 * The browser stays the place a case is edited — every screen still writes to
 * local storage first and never waits on a network call to show what it saved.
 * This pushes a copy afterwards, so the link in someone's email opens their
 * case on the phone they read it on, and a cleared cache is an inconvenience
 * rather than the loss of the only record of what happened to them.
 *
 * The failure mode is chosen deliberately. A push that fails is remembered and
 * retried, including across reloads: nothing the person typed is lost because a
 * train went into a tunnel. What is *not* attempted is a merge — two devices
 * editing the same case at once resolve to the last write, and the revision the
 * server returns is what a later load compares against.
 */

export type CaseSyncState = "idle" | "saving" | "saved" | "offline" | "local-only";

const PENDING_KEY = "kavach.case-sync.pending.v1";
const REVISION_KEY = "kavach.case-sync.revision.v1";
const DEBOUNCE_MS = 900;

const queued = new Map<string, CaseFile>();
const listeners = new Set<() => void>();
let state: CaseSyncState = "idle";
let timer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;

function setState(next: CaseSyncState): void {
  if (state === next) return;
  state = next;
  for (const listener of listeners) listener();
}

export function caseSyncState(): CaseSyncState {
  return state;
}

export function subscribeCaseSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** The server never has an opinion about this, so it renders as idle. */
const serverSyncState = (): CaseSyncState => "idle";

export function useCaseSyncState(): CaseSyncState {
  return useSyncExternalStore(subscribeCaseSync, caseSyncState, serverSyncState);
}

function readIdMap(key: string): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "{}") as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, number>;
  } catch {
    return {};
  }
}

function writeIdMap(key: string, value: Record<string, number>): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A full or disabled store only costs the retry-after-reload guarantee.
  }
}

function markPending(id: string): void {
  writeIdMap(PENDING_KEY, { ...readIdMap(PENDING_KEY), [id]: Date.now() });
}

function clearPending(id: string): void {
  const pending = readIdMap(PENDING_KEY);
  if (!(id in pending)) return;
  delete pending[id];
  writeIdMap(PENDING_KEY, pending);
}

export function localRevision(id: string): number {
  return readIdMap(REVISION_KEY)[id] ?? 0;
}

function rememberRevision(id: string, revision: number): void {
  writeIdMap(REVISION_KEY, { ...readIdMap(REVISION_KEY), [id]: revision });
}

function forgetRevision(id: string): void {
  const revisions = readIdMap(REVISION_KEY);
  if (!(id in revisions)) return;
  delete revisions[id];
  writeIdMap(REVISION_KEY, revisions);
}

/** The sample is built from the repository on every device; it needs no row. */
export function isSyncable(id: string): boolean {
  return id !== DEMO_CASE_ID;
}

export function queueCaseSync(caseFile: CaseFile): void {
  if (typeof window === "undefined" || !isSyncable(caseFile.id)) return;
  queued.set(caseFile.id, caseFile);
  markPending(caseFile.id);
  setState("saving");
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { void flush(); }, DEBOUNCE_MS);
}

async function push(caseFile: CaseFile): Promise<"done" | "retry" | "refused"> {
  const key = ensureCaseKey(caseFile.id);
  try {
    const response = await fetch("/api/cases/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: caseFile.id, key, case: caseFile }),
    });
    if (response.ok) {
      const body = await response.json().catch(() => null) as { revision?: number } | null;
      if (typeof body?.revision === "number") rememberRevision(caseFile.id, body.revision);
      return "done";
    }
    // 403 is another holder's case and 4xx is a case this build cannot store.
    // Retrying either forever would burn the queue on every save.
    return response.status >= 500 || response.status === 503 ? "retry" : "refused";
  } catch {
    return "retry";
  }
}

async function flush(): Promise<void> {
  if (flushing || typeof window === "undefined") return;
  flushing = true;
  try {
    let failed = false;
    while (queued.size) {
      const [id, caseFile] = queued.entries().next().value as [string, CaseFile];
      queued.delete(id);
      const result = await push(caseFile);
      if (result === "done" || result === "refused") clearPending(id);
      if (result === "retry") {
        // Put it back for the next attempt rather than dropping the edit.
        if (!queued.has(id)) queued.set(id, caseFile);
        failed = true;
        break;
      }
    }
    setState(failed ? "offline" : "saved");
  } finally {
    flushing = false;
  }
}

/**
 * Retry whatever an earlier visit could not send.
 *
 * The case store owns the lookup, and passes it in: this module never imports
 * the store, so the two cannot form a cycle at load time.
 */
export function resumeCaseSync(lookup: (id: string) => CaseFile | null): void {
  if (typeof window === "undefined") return;
  const pending = Object.keys(readIdMap(PENDING_KEY));
  if (!pending.length) return;
  for (const id of pending) {
    const caseFile = isSyncable(id) ? lookup(id) : null;
    if (caseFile) queued.set(id, caseFile);
    else clearPending(id);
  }
  if (queued.size) {
    setState("saving");
    void flush();
  }
}

export interface RestoredCase {
  caseFile: CaseFile;
  revision: number;
}

/** Ask the server for a case this device does not have, or has an older copy of. */
export async function fetchStoredCase(id: string, key: string): Promise<RestoredCase | null> {
  try {
    const response = await fetch("/api/cases/fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, key }),
    });
    if (!response.ok) return null;
    const body = await response.json() as { case?: CaseFile; revision?: number };
    if (!body.case || typeof body.case !== "object" || body.case.id !== id) return null;
    return { caseFile: body.case, revision: Number(body.revision) || 0 };
  } catch {
    return null;
  }
}

/** Delete the stored copy too, so "delete this case" means what it says. */
export async function deleteStoredCase(id: string): Promise<void> {
  const key = readCaseKey(id);
  clearPending(id);
  forgetRevision(id);
  queued.delete(id);
  if (!key || !isSyncable(id)) return;
  try {
    await fetch("/api/cases/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, key }),
    });
  } finally {
    forgetCaseKey(id);
  }
}

/** Record the revision that came back with a case pulled from the server. */
export function adoptRevision(id: string, revision: number): void {
  rememberRevision(id, revision);
  clearPending(id);
}
