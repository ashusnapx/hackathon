import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activeCaseId, deleteCase, getCase, newCase, saveCase } from "../store";

const CASES_KEY = "kavach.cases.v1";
const ACTIVE_KEY = "kavach.active.v1";
const DELETED_KEY = "kavach.deleted-cases.v1";

class TestStorage implements Storage {
  private values = new Map<string, string>();
  readonly writes: string[] = [];
  readonly failWrites = new Set<string>();
  readonly failReads = new Set<string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    if (this.failReads.has(key)) throw new Error("storage disabled");
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.writes.push(key);
    if (this.failWrites.has(key)) throw new Error("storage disabled");
    this.values.set(key, value);
  }
}

let storage: TestStorage;

beforeEach(() => {
  storage = new TestStorage();
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("case persistence result", () => {
  it("writes the case before setting its active pointer", () => {
    const caseFile = newCase({ id: "case-safe-order" });

    expect(saveCase(caseFile)).toBe(true);
    // The record lands before the resume pointer, so a failed write can never
    // leave the pointer aimed at a case that was not stored. The sync marker
    // that follows is bookkeeping for the push, and cannot precede either.
    expect(storage.writes.slice(0, 2)).toEqual([CASES_KEY, ACTIVE_KEY]);
    expect(activeCaseId()).toBe(caseFile.id);
    expect(getCase(caseFile.id)?.ref).toBe(caseFile.ref);
  });

  it("returns false, does not throw and leaves the active pointer unchanged when the case write fails", () => {
    storage.setItem(ACTIVE_KEY, "existing-case");
    storage.writes.length = 0;
    storage.failWrites.add(CASES_KEY);
    const caseFile = newCase({ id: "case-not-persisted" });
    let result: boolean | undefined;

    expect(() => {
      result = saveCase(caseFile);
    }).not.toThrow();
    expect(result).toBe(false);
    expect(storage.writes).toEqual([CASES_KEY]);
    expect(activeCaseId()).toBe("existing-case");
    expect(getCase(caseFile.id)).toBeNull();
  });

  it("reports a partial failure if the case persists but the active pointer cannot", () => {
    storage.failWrites.add(ACTIVE_KEY);
    const caseFile = newCase({ id: "case-without-active-pointer" });

    expect(saveCase(caseFile)).toBe(false);
    expect(getCase(caseFile.id)?.id).toBe(caseFile.id);
    expect(activeCaseId()).toBeNull();
  });

  it("does not crash when the active-case pointer cannot be read", () => {
    storage.failReads.add(ACTIVE_KEY);
    expect(activeCaseId()).toBeNull();
  });

  it("removes the case record before reporting incomplete IndexedDB evidence cleanup", async () => {
    const caseFile = newCase({ id: "case-with-local-evidence" });
    const evidence = caseFile.evidence!;
    caseFile.evidence = [
      {
        ...evidence[0],
        status: "added",
        attachment: {
          name: "statement.pdf",
          size: 100,
          type: "application/pdf",
          addedAt: "2026-09-04T06:00:00.000Z",
          storageKey: "case-with-local-evidence:txn_screenshot",
          sha256: "abc123",
          storedLocally: true,
        },
      },
      ...evidence.slice(1),
    ];
    expect(saveCase(caseFile)).toBe(true);

    // Node has no IndexedDB, which deterministically exercises a cleanup
    // failure after the recoverable localStorage deletion has succeeded.
    const result = await deleteCase(caseFile.id);

    expect(result).toEqual({ recordDeleted: true, evidenceCleanup: "incomplete" });
    expect(getCase(caseFile.id)).toBeNull();
    expect(activeCaseId()).toBeNull();
    expect(JSON.parse(storage.getItem(DELETED_KEY) || "{}")).toHaveProperty(caseFile.id);
    expect(saveCase(caseFile)).toBe(false);
    expect(getCase(caseFile.id)).toBeNull();
  });
});
